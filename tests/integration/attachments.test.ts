import { describe, expect, it } from "vitest";
import {
  AttachmentError,
  deleteAttachment,
  getAttachmentForUser,
  saveAttachments,
} from "@/server/queries/attachments";
import { createService, deleteService, getService } from "@/server/queries/services";
import { storage } from "@/server/storage";
import { makeHousehold } from "./factories";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100, 1)]);
const jpeg = (name = "receipt.jpg", body = JPEG) => new File([body], name, { type: "image/jpeg" });

async function serviceFor(h: Awaited<ReturnType<typeof makeHousehold>>) {
  return createService(h.householdId, h.userId, {
    vehicleId: h.vehicleId,
    date: "2026-09-01",
    odometer: 2000,
    totalCost: 0,
    items: [{ label: "Wash" }],
  });
}

describe("saveAttachments", () => {
  it("stores images and links them to the service", async () => {
    const h = await makeHousehold();
    const id = await serviceFor(h);
    await saveAttachments(h.householdId, { serviceRecordId: id }, [jpeg()]);
    const detail = await getService(h.householdId, id);
    expect(detail?.attachments).toHaveLength(1);
    const att = await getAttachmentForUser(h.householdId, detail!.attachments[0].id);
    expect(att?.contentType).toBe("image/jpeg");
    expect(await storage.read(att!.storageKey)).toEqual(JPEG);
  });

  it("rejects files that are not images even if they claim to be", async () => {
    const h = await makeHousehold();
    const id = await serviceFor(h);
    const fake = new File(["%PDF-1.7 not an image"], "x.jpg", { type: "image/jpeg" });
    await expect(saveAttachments(h.householdId, { serviceRecordId: id }, [fake])).rejects.toBeInstanceOf(AttachmentError);
    expect((await getService(h.householdId, id))?.attachments).toHaveLength(0);
  });

  it("rejects files over 4 MB", async () => {
    const h = await makeHousehold();
    const id = await serviceFor(h);
    const big = jpeg("big.jpg", Buffer.concat([JPEG, Buffer.alloc(4 * 1024 * 1024)]));
    await expect(saveAttachments(h.householdId, { serviceRecordId: id }, [big])).rejects.toThrow(/4 MB/);
  });

  it("ignores empty file inputs", async () => {
    const h = await makeHousehold();
    const id = await serviceFor(h);
    await saveAttachments(h.householdId, { serviceRecordId: id }, [new File([], "")]);
    expect((await getService(h.householdId, id))?.attachments).toHaveLength(0);
  });

  it("refuses to attach to another household's service", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const id = await serviceFor(a);
    await expect(saveAttachments(b.householdId, { serviceRecordId: id }, [jpeg()])).rejects.toThrow(/not found/);
  });
});

describe("access", () => {
  it("hides attachments from other households", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const id = await serviceFor(a);
    await saveAttachments(a.householdId, { serviceRecordId: id }, [jpeg()]);
    const [att] = (await getService(a.householdId, id))!.attachments;
    expect(await getAttachmentForUser(b.householdId, att.id)).toBeNull();
    expect(await getAttachmentForUser(a.householdId, "00000000-0000-0000-0000-000000000000")).toBeNull();
  });
});

describe("cleanup", () => {
  it("deleting a service returns the storage keys of its photos", async () => {
    const h = await makeHousehold();
    const id = await serviceFor(h);
    await saveAttachments(h.householdId, { serviceRecordId: id }, [jpeg(), jpeg("b.jpg")]);
    const keys = await deleteService(h.householdId, id);
    expect(keys).toHaveLength(2);
  });

  it("deletes a single attachment only within the household", async () => {
    const a = await makeHousehold();
    const b = await makeHousehold();
    const id = await serviceFor(a);
    await saveAttachments(a.householdId, { serviceRecordId: id }, [jpeg()]);
    const [att] = (await getService(a.householdId, id))!.attachments;
    await expect(deleteAttachment(b.householdId, att.id)).rejects.toThrow(/not found/);
    await deleteAttachment(a.householdId, att.id);
    expect((await getService(a.householdId, id))?.attachments).toHaveLength(0);
  });
});
