// 1.2 TypeScript (JavaScript + kiểu dữ liệu)
// let la mot tu khoa de khai bao bien co the thay doi gia tri
// 1. KHAI BÁO KIỂU DỮ LIỆU CƠ BẢN
let Name : string = "John Doe";
let Age: number = 27;
let isActive: boolean = true;
let skills : string[] = ["React", "Node.js", "TypeScript"];
//Interface: Định nghĩa cấu trúc của một đối tượng (Object)

interface Job {
    id: string;
    title: string;
    salary: string;
    company: company;
}

interface company {
    id: string;
    name: string;
    logo: string;
}

const job: Job = {
    id: "123",
    title: "Developer",
    salary: "3000000 VND",
    company: {
        id:"tech corp id",
        name: "tech corp name",
        logo: "tech corp logo"
    }
};

//3. Types: tương tự như interface nhưng linh hoạt hơn
type User = {
    id: string;
    name: string;
    email: string;
};
//4. Optional properties: Thuộc tính tùy chọn/ Thuộc tính không bắt buộc
type Product ={
    id: string;
    name: string;
    description?: string; //thuộc tính không bắt buộc / có thể có hoặc không

}
// Union Types: Kiểu hợp (có thể là một trong các kiểu được định nghĩa) (|) - Nhiều kiểu
type Status = "pending" | "active" | "completed"| "canceled";
let jobStatus : Status = "active";  // Chỉ được 3 giá trị này

// Generic - Kiểu động
interface ApiResponse<T> {
    data: T;
    error: string|null;
}