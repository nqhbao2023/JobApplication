// types.ts

export interface Job {
    $id: string;
    title: string;
    image: string;
    salary: string;
    skills_required: string;
    responsibilities: string;
    created_at: string;
    updated_at: string;
    jobTypes: JobType;
    jobCategories: JobCategory;
    users: User;
    job_Description: string;
    company: Company;
  }
  
  export interface JobType {
    $id: string;
    type_name: string;
  }
  
  export interface JobCategory {
    $id: string;
    category_name: string;
    icon_name: string;
    color: string;
  }
  
  export interface User {
    $id: string;
    name: string;
    email: string;
    phone?: string;
    isAdmin?: boolean;
    id_image?: string;
    isRecruiter?: boolean;
  }
  
  export interface Company  {
    $id: string;
    corp_name: string;
    nation: string;
    corp_description: string;
    city: string;
    image: string;
    color: string;
  };
  
  
  export interface Message {
    $id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: string;
    jobId: string;
  }
