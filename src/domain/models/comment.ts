export type Comment = {
  id: string;
  momentId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CommentWithUser = Comment & {
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
  };
};
