import Joi from 'joi';

export const quickPostJobSchema = Joi.object({
  title: Joi.string().required().min(10).max(200),
  description: Joi.string().required().min(20).max(2000),
  company: Joi.string().optional().max(100),
  location: Joi.string().required().max(200),
  salary: Joi.string().optional(), // VD: "50k-70k/giờ", "5-7 triệu"
  hourlyRate: Joi.number().optional().min(0),
  workSchedule: Joi.string().optional(), // VD: "Thứ 2,4,6 tối"
  type: Joi.string().valid('full-time', 'part-time', 'contract', 'internship').default('part-time'),
  category: Joi.string().optional(),
  
  // Contact info (ít nhất 1 trong các field)
  contactInfo: Joi.object({
    phone: Joi.string().optional().pattern(/^[0-9]{10,11}$/),
    zalo: Joi.string().optional(),
    facebook: Joi.string().optional().uri(),
    email: Joi.string().optional().email(),
  })
    .required()
    .or('phone', 'email') // Phải có ít nhất phone hoặc email
    .messages({
      'object.missing': 'At least phone or email is required',
    }),
});

export const approveQuickPostSchema = Joi.object({
  // Không cần body
});

export const rejectQuickPostSchema = Joi.object({
  reason: Joi.string().optional().max(500),
});
