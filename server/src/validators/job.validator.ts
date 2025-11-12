import Joi from 'joi';

export const createJobSchema = Joi.object({
  title: Joi.string().required().min(5).max(200),
  company: Joi.string().required().min(2).max(200),
  companyId: Joi.string().required(),
  description: Joi.string().required().min(20),
  requirements: Joi.array().items(Joi.string()).required(),
  skills: Joi.array().items(Joi.string()).required(),
  salary: Joi.object({
    min: Joi.number().required().min(0),
    max: Joi.number().required().min(0),
    currency: Joi.string().required().valid('VND', 'USD'),
  }).required(),
  location: Joi.string().required(),
  // Thay đổi: Chấp nhận jobTypeId từ Firestore thay vì hardcode enum
  type: Joi.string().required().min(1), // ID của job type trong Firestore
  jobTypeId: Joi.string().optional(), // Alias cho type (để tương thích)
  category: Joi.string().required(),
  status: Joi.string().valid('active', 'inactive', 'closed').default('active'),
  expiresAt: Joi.date().optional(),
});

export const updateJobSchema = Joi.object({
  title: Joi.string().min(5).max(200),
  company: Joi.string().min(2).max(200),
  description: Joi.string().min(20),
  requirements: Joi.array().items(Joi.string()),
  skills: Joi.array().items(Joi.string()),
  salary: Joi.object({
    min: Joi.number().min(0),
    max: Joi.number().min(0),
    currency: Joi.string().valid('VND', 'USD'),
  }),
  location: Joi.string(),
  // Thay đổi: Chấp nhận bất kỳ job type ID nào từ Firestore
  type: Joi.string().min(1),
  jobTypeId: Joi.string().optional(),
  category: Joi.string(),
  status: Joi.string().valid('active', 'inactive', 'closed'),
  expiresAt: Joi.date(),
}).min(1);

