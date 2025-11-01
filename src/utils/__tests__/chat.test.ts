import { createChatId } from "../chat";

describe("createChatId()", () => {
  test("tạo chatId không phụ thuộc thứ tự UID", () => {
    const id1 = createChatId("userA", "userB");
    const id2 = createChatId("userB", "userA");
    expect(id1).toBe(id2);
  });

  test("tạo chatId ổn định và có ký tự phân cách", () => {
    const id = createChatId("alpha", "beta");
    expect(id).toBe("alpha_beta"); // vì 'alpha' < 'beta'
    expect(id.split("_")).toHaveLength(2);
  });

  test("tạo chatId khi UID trùng nhau", () => {
    const id = createChatId("sameUser", "sameUser");
    expect(id).toBe("sameUser_sameUser");
  });

  test("tạo chatId vẫn ổn định khi UID chứa ký tự đặc biệt", () => {
    const id1 = createChatId("u$id#1", "u$id#2");
    const id2 = createChatId("u$id#2", "u$id#1");
    expect(id1).toBe(id2);
    expect(id1).toContain("_");
  });
});
