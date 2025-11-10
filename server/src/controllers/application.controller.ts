import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import applicationService from '../services/application.service';

export const updateApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const candidateId = req.user!.uid;
    const { cvUrl, coverLetter } = req.body;

    const application = await applicationService.updateApplication(id, candidateId, {
      cvUrl,
      coverLetter,
    });

    res.json(application);
  } catch (error) {
    next(error);
  }
};

export const createApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // ✅ Validate employerId is not empty
    if (!req.body.employerId || req.body.employerId.trim() === '') {
      res.status(400).json({
        error: 'Validation Error',
        message: 'employerId is required and cannot be empty',
      });
      return;
    }

    const applicationData = {
      ...req.body,
      candidateId: req.user!.uid,
    };

    const application = await applicationService.createApplication(applicationData);
    res.status(201).json(application);
  } catch (error) {
    next(error);
  }
};

export const getCandidateApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const candidateId = req.user!.uid;
    const applications = await applicationService.getApplicationsByCandidate(candidateId);
    res.json(applications);
  } catch (error) {
    next(error);
  }
};

export const getEmployerApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const employerId = req.user!.uid;
    const applications = await applicationService.getApplicationsByEmployer(employerId);
    res.json(applications);
  } catch (error) {
    next(error);
  }
};

export const getJobApplications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { jobId } = req.params;
    const applications = await applicationService.getApplicationsByJob(jobId);
    res.json(applications);
  } catch (error) {
    next(error);
  }
};

export const updateApplicationStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const application = await applicationService.updateApplicationStatus(id, status);
    res.json(application);
  } catch (error) {
    next(error);
  }
};

export const withdrawApplication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const candidateId = req.user!.uid;

    await applicationService.withdrawApplication(id, candidateId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

