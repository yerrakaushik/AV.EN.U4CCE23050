import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

type NotificationCategory = "Event" | "Result" | "Placement";

interface IncomingNotification {
  ID: string;
  Type: NotificationCategory;
  Message: string;
  Timestamp: string;
}

interface ProcessedNotification {
  id: string;
  category: NotificationCategory; 
  text: string;
  time: string;
  score: number;
}

const typeWeights: Record<NotificationCategory, number> = {
  Placement: 30,
  Result: 20,
  Event: 10,
};

async function getAuthToken(): Promise<string> {
  const credentials = {
      email: process.env.EMAIL,
      name: process.env.NAME,
      rollNo: process.env.ROLL_NO,
      accessCode: process.env.ACCESS_CODE,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
  };
  
  const res = await axios.post(
    `${process.env.TEST_SERVER_BASE_URL}/evaluation-service/auth`,
    credentials
  );
  return res.data.access_token;
}

function calculateScore(type: NotificationCategory, timestamp: string): number {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffHrs = diffMs / (1000 * 60 * 60);
  
  let freshness = 100 - diffHrs;
  if (freshness < 0) {
    freshness = 0; 
  }
  
  return typeWeights[type] + freshness;
}

class PriorityHeap {
  private heap: ProcessedNotification[] = [];

  count() {
    return this.heap.length;
  }

  peek(): ProcessedNotification {
    return this.heap[0];
  }

  enqueue(item: ProcessedNotification) {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  dequeue(): ProcessedNotification {
    const root = this.heap[0];
    const tail = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = tail;
      this.bubbleDown(0);
    }
    return root;
  }

  private bubbleUp(index: number) {
    while (index > 0) {
      let parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].score <= this.heap[index].score) break;
      
      let temp = this.heap[parentIndex];
      this.heap[parentIndex] = this.heap[index];
      this.heap[index] = temp;
      
      index = parentIndex;
    }
  }

  private bubbleDown(index: number) {
    const size = this.heap.length;
    while (true) {
      let smallest = index;
      let left = 2 * index + 1;
      let right = 2 * index + 2;
      
      if (left < size && this.heap[left].score < this.heap[smallest].score) {
        smallest = left;
      }
      if (right < size && this.heap[right].score < this.heap[smallest].score) {
        smallest = right;
      }
      if (smallest === index) break;
      
      let temp = this.heap[smallest];
      this.heap[smallest] = this.heap[index];
      this.heap[index] = temp;
      
      index = smallest;
    }
  }

  exportSorted(): ProcessedNotification[] {
    return [...this.heap].sort((a, b) => b.score - a.score);
  }
}

function filterTopNotifications(list: IncomingNotification[], maxCount: number): ProcessedNotification[] {
  const heap = new PriorityHeap();

  for (let i = 0; i < list.length; i++) {
      const raw = list[i];
      const score = calculateScore(raw.Type, raw.Timestamp);
      
      const processed: ProcessedNotification = {
          id: raw.ID,
          category: raw.Type,
          text: raw.Message,
          time: raw.Timestamp,
          score: score,
      };

      if (heap.count() < maxCount) {
          heap.enqueue(processed);
      } else if (score > heap.peek().score) {
          heap.dequeue();
          heap.enqueue(processed);
      }
  }

  return heap.exportSorted();
}

async function main() {
  const LIMIT = 10;

  console.log("Authenticating...");
  let token = await getAuthToken();

  console.log("Fetching notifications...");
  const response = await axios.get(
    `${process.env.TEST_SERVER_BASE_URL}/evaluation-service/notifications`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let rawNotifications: IncomingNotification[] = response.data.notifications || [];
  console.log(`Retrieved ${rawNotifications.length} notifications.`);

  let topNotifications = filterTopNotifications(rawNotifications, LIMIT);

  console.log(`\nDisplaying top ${LIMIT} high-priority items:\n====================================`);
  topNotifications.forEach((item, index) => {
      console.log(`${index + 1}. [${item.category}] - ${item.text}`);
      console.log(`   Internal ID: ${item.id}`);
      console.log(`   Sent At: ${item.time}`);
      console.log(`   Priority Score: ${item.score.toFixed(2)}`);
      console.log("");
  });
}

main().catch((err) => {
  console.error("Execution failed:", err.message);
  process.exit(1);
});
