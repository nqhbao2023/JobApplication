import Joi from 'joi';

export const upsertUserSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  phone: Joi.string().min(8).max(20).required(),
  role: Joi.string().valid('candidate', 'employer', 'admin', 'student').required(),
  email: Joi.string().email().optional(),
});
