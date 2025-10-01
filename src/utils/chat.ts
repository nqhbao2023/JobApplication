
// Tạo chatId duy nhất cho 2 user bất kỳ
export const createChatId = (uid1: string, uid2: string) => {
  return [uid1, uid2].sort().join("_"); 
};
