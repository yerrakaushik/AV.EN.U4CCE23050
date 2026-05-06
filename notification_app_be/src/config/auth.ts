import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getAuthToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && now < tokenExpiry - 60) return cachedToken;

  const response = await axios.post(
    "http://20.207.122.201/evaluation-service/auth",
    {
      email: process.env.EMAIL,
      name: process.env.NAME,
      rollNo: process.env.ROLL_NO,
      accessCode: process.env.ACCESS_CODE,
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
    }
  );

  cachedToken = response.data.access_token;
  tokenExpiry = response.data.expires_in;
  return cachedToken as string;
}
