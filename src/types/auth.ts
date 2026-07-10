export type AuthUser = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  passwordHash: string;
};

export type AuthSession = {
  userId: string;
  email: string;
  name: string;
  nickname: string;
};
