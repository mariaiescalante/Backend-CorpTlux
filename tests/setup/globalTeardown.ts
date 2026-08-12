import { closeDb } from "../helpers/db";

export default async function globalTeardown(): Promise<void> {
  await closeDb();
}
