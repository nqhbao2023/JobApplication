import React, { createContext, useState, useContext, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage';

type SavedJobsContextType = {
    savedJobs: string[];
    toggleSaveJob: (jobId: string) => void;
    isJobSaved: (jobId: string) => boolean;
};

const SavedJobsContext = createContext<SavedJobsContextType | undefined>(undefined);

export const SavedJobsProvider = ({ children }: { children: React.ReactNode }) => {
    const [savedJobs, setSavedJobs] = useState<string[]>([]);

    // load saved jobs từ storage mỗi khi mở app
    useEffect(() => {
        const loadSavedJobs = async () => {
            try {
                const savedJobsData = await AsyncStorage.getItem('savedJobs');
                if (savedJobsData) {
                    setSavedJobs(JSON.parse(savedJobsData));
                }
            }
            catch (error) {
                console.error('Error loading saved jobs:', error);
            }
        };
        loadSavedJobs();
    }, []);

    // lưu saved jobs mỗi khi có sự thay đổi
    useEffect(() => {
        const saveToDisk = async () => {
            try {
                await AsyncStorage.setItem('savedJobs', JSON.stringify(savedJobs));
            }
            catch (error) {
                console.error('Error saving jobs:', error);
            }
        };
        saveToDisk();
    }, [savedJobs]);

    const toggleSaveJob = (jobId: string) => {
        setSavedJobs((prev) => 
            prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
        );
    };

    const isJobSaved = (jobId: string) => {
        return savedJobs.includes(jobId);
    };

    return (
        <SavedJobsContext.Provider value={{ savedJobs, toggleSaveJob, isJobSaved }}>
            {children}
        </SavedJobsContext.Provider>
    );
};

export const useSavedJobs = () => {
    const context = useContext(SavedJobsContext);
    if (context === undefined) {
        throw new Error('useSavedJobs must be used within a SavedJobsProvider');
    }
    return context;
};
