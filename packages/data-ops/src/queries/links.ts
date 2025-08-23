import {
  CreateLinkSchemaType,
  destinationsSchema,
  DestinationsSchemaType,
  linkSchema,
} from "@/zod/links";
import { linkClicks, links } from "../drizzle-out/schema";
import { getDb } from "@/db/database";
import { nanoid } from "nanoid";
import { and, desc, eq, gt, lt } from "drizzle-orm";
import { LinkClickMessageType } from "@/zod/queue";

// TODO: Validate input
export async function createLink(
  data: CreateLinkSchemaType & { accountId: string }
) {
  const db = getDb();
  const id = nanoid(10); // this should be done by the DB...
  const [linkId] = await db
    .insert(links)
    .values({
      linkId: id,
      accountId: data.accountId,
      name: data.name,
      destinations: JSON.stringify(data.destinations),
    })
    .returning({ linkId: links.linkId });
  return linkId;
}

// TODO: Add pagination
// TODO: Add proper parsing of each item (see getLink)
export async function getLinks(accountId: string, createdBefore?: string) {
  const db = getDb();

  const conditions = [eq(links.accountId, accountId)];

  if (createdBefore) {
    conditions.push(gt(links.created, createdBefore));
  }

  const result = await db
    .select()
    .from(links)
    .where(and(...conditions))
    .orderBy(desc(links.created))
    .limit(25);

  return result.map((link) => ({
    ...link,
    lastSixHours: Array.from({ length: 6 }, () =>
      Math.floor(Math.random() * 100)
    ),
    linkClicks: 5,
    destinations: Object.keys(JSON.parse(link.destinations)).length,
  }));
}

// TODO: Verify that the user is the owner of the link
export async function getLink(linkId: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(links)
    .where(eq(links.linkId, linkId))
    .limit(1);

  if (!result.length) return null;
  const parsedLink = linkSchema.safeParse(result[0]);
  if (!parsedLink.success) {
    console.error(parsedLink.error);
    throw new Error("Invalid link data");
  }
  return parsedLink.data;
}

// TODO: Verify that the user is the owner of the link
export async function updateLinkName(linkId: string, name: string) {
  const db = getDb();
  await db.update(links).set({ name }).where(eq(links.linkId, linkId));
}

// TODO: Verify that the user is the owner of the link
export async function updateLinkDestinations(
  linkId: string,
  destinations: DestinationsSchemaType
) {
  const parsedDestinations = destinationsSchema.parse(destinations);

  const db = getDb();

  await db
    .update(links)
    .set({
      destinations: JSON.stringify(parsedDestinations),
      updated: new Date().toISOString(),
    })
    .where(eq(links.linkId, linkId));
}

export async function addLinkClick(info: LinkClickMessageType["data"]) {
  const db = getDb();
  await db.insert(linkClicks).values({
    id: info.id,
    accountId: info.accountId,
    country: info.country,
    destination: info.destination,
    latitude: info.latitude,
    longitude: info.longitude,
    clickedTime: info.timestamp,
  });
}
