import Joi from 'joi';

export const createApplicationSchema = Joi.object({
  jobId: Joi.string().required().trim().min(1),
  employerId: Joi.string().required().trim().min(1).messages({
    'string.empty': 'employerId cannot be empty',
    'any.required': 'employerId is required',
  }),
  cvUrl: Joi.string().uri().optional().allow(''),
  coverLetter: Joi.string().max(1000).optional().allow(''),
});

