import Joi from 'joi';

export const createApplicationSchema = Joi.object({
  jobId: Joi.string().required(),
  employerId: Joi.string().required(),
  cvUrl: Joi.string().uri().optional(),
  coverLetter: Joi.string().max(1000).optional(),
});

