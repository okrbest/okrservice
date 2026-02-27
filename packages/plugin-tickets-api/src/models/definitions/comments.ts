import { field } from '@erxes/api-utils/src';
import { Document, Schema } from 'mongoose';

const attachmentSchema = new Schema(
  {
    name: field({ type: String }),
    url: field({ type: String }),
    type: field({ type: String }),
    size: field({ type: Number, optional: true }),
    duration: field({ type: Number, optional: true }),
  },
  { _id: false }
);

export interface IComment {
    typeId: string;
    type: string;

    content?: string;
    parentId?: string;

    userId?: string;
    userType?: string;
    attachments?: Array<{ name?: string; url?: string; type?: string; size?: number; duration?: number }>;
}

export interface ICommentDocument extends IComment, Document {
    _id: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export const USER_TYPES = {
    TEAM: 'team',
    CLIENT: 'client',
    EMAIL: 'email',
    ALL: ['team', 'client', 'email']
};

export const commentSchema = new Schema({
    typeId: field({ type: String, label: 'Type Id' }),
    type: field({ type: String, label: 'Type' }),

    content: field({ type: String, label: 'Content', optional: true }),
    parentId: field({ type: String, label: 'Parent Id' }),

    userId: field({ type: String, label: 'User Id' }),
    userType: field({ type: String, enum: USER_TYPES.ALL, label: 'User Type' }),

    attachments: field({ type: [attachmentSchema], optional: true, label: 'Attachments' }),

    createdAt: field({ type: Date, label: 'Created at' }),
    updatedAt: field({ type: Date, label: 'Updated at' })
});
