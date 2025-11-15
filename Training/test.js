import fetch from 'node-fetch';
// 3. TEMPLATE LITERALS (dấu backtick `)
const name = "John";
const age = 25;

const message = ` My name is ${name} and I am ${age} year old`
console.log(message);

// 4. DESTRUCTURING (tách object/array)
const user = { name2: "john", age2: 30, email: "nqbbao@gmail.com" };
const { name2, age2, email } = user;
console.log(email);

const numbers = [1, 2, 3, 4, 5];
const [seconds, third, five] = numbers;
console.log(five);

// 5. SPREAD OPERATOR (...)
const arr1 = [1, 2, 3, 4, 5];
const arr2 = [...arr1, 7, 8, 9];
console.log(arr2);

const obj1 = { name3: "john", age: 30 };
const obj2 = { ...obj1, email2: "nqbbao@gmail.com" };
console.log(obj2);


// 6. ASYNC/AWAIT (Xử lý bất đồng bộ)
// Thay vì dùng .then():
fetch('https://jsonplaceholder.typicode.com/posts')
  .then(response => response.json())
  .then(data => console.log(data));
// Dùng async/await (dễ đọc hơn):
const fetchJobs = async () => {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts');
  const data = await response.json();
  console.log(data);
};
fetchJobs();

// 7. ARRAY METHODS (quan trọng!)
const jobs = [
  { id: 1, title: "Developer", salary: 10000 },
  { id: 2, title: "Designer", salary: 20000 },
  { id: 3, title: " Manager", salary: 30000 },
];

// map: Biến đổi mỗi phần tử
const jobTitles = jobs.map(job => job.title);
console.log(jobTitles);

const jobID = jobs.map(job => job.id);
console.log(jobID);

const jobSalary = jobs.map(job => job.salary);
console.log(jobSalary);

// filter: Lọc phần tử
const highSalaryJobs = jobs.filter(job => job.salary >= 20000);
const jobIDs = jobs.filter(job => job.id >= 3);
console.log(highSalaryJobs);
console.log(jobIDs);
