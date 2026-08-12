import { resetDb } from "../helpers/db";

export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = "test";
  await resetDb();
}
