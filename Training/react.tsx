import {View, Text} from 'react-native';
import React from'react';
// 1. COMPONENT - Khối xây dựng của UI
// Component = Function trả về JSX (giống HTML)
 const JobCard1 = () => {
    return (
        <View>
            <Text>
                Job Card Component
            </Text>
            <Text> 1000USD/Month Job card componet2</Text>
        </View>
    );
};
// 2. PROPS - Truyền dữ liệu từ component cha xuống con
interface JobCardProps {
    title: string;
    salary: string;
};

export const JobCard2 = ({ title, salary} : JobCardProps) =>{
    return (
        <View>
            <Text> {title} </Text>
            <Text>{salary} </Text>
        </View>
    );
};

//Sử dụng Component và Props
<JobCard2 title ="Developer" salary = "$10000"/>;

// 3. STATE - Dữ liệu thay đổi trong component
import {useState} from 'react';

interface Job {
    id: number;
    title: string;
    salary: string;
}
const JobList = () => {
    const [jobs, setJobs] = useState<Job[]> ([]);
    const [loading, setLoading] = useState(false); 

//thay đổi state
const addJob = (newJob: Job) => {
    setJobs ([...jobs, newJob]);
};

return (
    <View>
        {jobs.map(job =>(<JobCard2 key ={job.id} title={job.title} salary = {job.salary} />))}
    </View>
);
};
// 4. USEEFFECT - Chạy code khi component mount/update
import {useEffect} from 'react';

    const JobList2 = () => {
    const [jobs, setJobs] = useState<Job[]> ([]);
//Chạy 1 lần khi component load (mount)
    useEffect (() =>{
        fetchJobs();
},[]) // [] = chỉ chạy 1 lần

//Chạy mỗi khi jobs thay đổi
    useEffect (() => {
        console.log ("Jobs updated:", jobs);
    }, [jobs]); //theo dõi jobs

    // Định nghĩa hàm fetchJobs
        const fetchJobs = async () => {
            const response = await fetch ('api/jobs');
            const data = await response.json();
            setJobs (data);
        };

}