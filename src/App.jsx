// StudyFlow Planner Frontend
// This React component allows the user to:
// 1. Enter a subject, topics, and exam deadline
// 2. Send the data to the Flask backend to generate a study plan
// 3. Display the generated plan
// 4. Track completed tasks and progress
// 5. Save plan and progress in localStorage

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
function App() {

  // ================================
  // STATE VARIABLES
  // ================================

  const [subject, setSubject] = useState("");
  const [topics, setTopics] = useState("");
  const [deadline, setDeadline] = useState("");

  const [plan, setPlan] = useState([]);
  const [completed, setCompleted] = useState([]);

  const [days, setDays] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [activeSubject, setActiveSubject] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState("list");

  const [darkMode, setDarkMode] = useState(false);

  // editing states
  const [editingIndex, setEditingIndex] = useState(null);
  const [editTopic, setEditTopic] = useState("");

  // reschedule states
  const [rescheduleIndex, setRescheduleIndex] = useState(null);
  const [newDate, setNewDate] = useState("");

  // calendar month navigation
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // ================================
  // LOAD SAVED DATA
  // ================================

  useEffect(() => {

    const savedPlan = localStorage.getItem("studyPlan");
    const savedCompleted = localStorage.getItem("completedTasks");

    if(savedPlan){
      const parsed = JSON.parse(savedPlan);
      setPlan(parsed);

      // Get all the subjects from the saved plan without duplicates
      const subs = [...new Set(parsed.map(p => p.subject))];
      setSubjects(subs);
    }

    if(savedCompleted){
      setCompleted(JSON.parse(savedCompleted));
    }

  },[]);
  useEffect(() => {
  localStorage.setItem("completedTasks", JSON.stringify(completed));
}, [completed]);
  // ================================
  // THEME TOGGLE (DARK MODE)
  // ================================

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // ================================
  // STUDY DAY SELECTION
  // ================================

  const toggleDay = (day) => {

  setDays(prev =>
  prev.includes(day)
    ? prev.filter(d => d !== day)
    : [...prev, day]
  );
 };
  // ================================
  // GENERATE STUDY PLAN
  // ================================

  const generatePlan = async () => {

    if (!subject || !topics || !deadline) {
      alert("Please fill all fields");
      return;
    }

  const topicList = topics
    .split("\n")
    .map(t => t.trim())
    .filter(t => t !== "");

  const response = await fetch("http://127.0.0.1:5000/generate-plan",{
    method:"POST",
    headers:{
      "Content-Type":"application/json"
    },
    body:JSON.stringify({
      subject:subject,
      topics:topicList,
      deadline:deadline,
      days:days
    })
  });

  const data = await response.json();

  
  const newTasks = data.map((task, index) => ({
    ...task,
    completed: false,              
    id: Date.now().toString() +"_"+ index +"_" + Math.random()        
  }));

  const updatedPlan = [...plan, ...newTasks];
  setPlan(updatedPlan);

  
  localStorage.setItem("studyPlan", JSON.stringify(updatedPlan));

  const subs = [...new Set([...subjects, subject])];
  setSubjects(subs);
  // users can see the generated plan immediately in the list view.
  setActiveSubject(subject);
  setShowModal(false);
  // reset input fields
  setSubject("");
  setTopics("");
  setDeadline("");
  setDays([]);
};

  // ================================
  // TASK COMPLETION
  // ================================

  const toggleComplete = (id) => {
    setCompleted(prev =>
     prev.includes(id)
     ? prev.filter(item => item !== id)
     : [...prev, id]
    );
  };
  // ================================
  // DELETE TASK
  // ================================

  const deleteTask = (id) => {

    // Filter out the deleted task
    // contains only the tasks that should remain in the plan
    const updatedPlan = plan.filter(task => task.id !== id);

    // Sync the completed list so progress math doesn't break
    // contains only the ids of tasks that are still in the plan
  const updatedCompleted = completed.filter(cid => cid !== id);

    setPlan(updatedPlan);
    setCompleted(updatedCompleted);

    localStorage.setItem("studyPlan", JSON.stringify(updatedPlan));
    localStorage.setItem("completedTasks", JSON.stringify(updatedCompleted));
  };

  // ================================
  // EDIT TASK FEATURE
  // ================================

  const saveEdit = (index) => {

    const updated = [...plan]; //copies all elements of the plan array into a new array called updated

    updated[index].topic = editTopic;

    setPlan(updated);

    localStorage.setItem("studyPlan", JSON.stringify(updated));
    // after saving the edit, we exit the editing mode by resetting the editingIndex to null, 
    // which hides the input field and shows the updated topic text instead.
    setEditingIndex(null);
  };

  // ================================
  // RESCHEDULE TASK FEATURE
  // ================================

  const saveReschedule = (index) => {
    
    if (!newDate) return;
    
    const updated = [...plan];

    updated[index].full_date = newDate;

    const dateObj = new Date(newDate);

    updated[index].date = dateObj.toLocaleDateString("en-GB",{
      day:"2-digit",
      month:"short"
    });

    setPlan(updated);

    localStorage.setItem("studyPlan", JSON.stringify(updated));

    setRescheduleIndex(null);

    setNewDate("");
  };

  // ================================
  // CALENDAR GRID GENERATION
  // ================================

  const generateCalendar = () => {

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let calendar = [];
    let dayCounter = 1;

    for (let i = 0; i < 6; i++) {

      let week = [];

      for (let j = 0; j < 7; j++) {

        if (i === 0 && j < firstDay) { // Fill empty cells before the first day of the month
          week.push(null);
        } 
        else if (dayCounter > daysInMonth) { // Fill empty cells after the last day of the month
          week.push(null);
        } 
        else {
          week.push(dayCounter); // Push the actual day number into the calendar grid
          dayCounter++;
        }

      }

      calendar.push(week);
    }

    return calendar;
  };

  // ================================
  // MONTH NAVIGATION
  // ================================

  const nextMonth = () => {
    const next = new Date(currentMonth);
    next.setMonth(currentMonth.getMonth()+1);
    setCurrentMonth(next);
  };

  const prevMonth = () => {
    const prev = new Date(currentMonth);
    prev.setMonth(currentMonth.getMonth()-1);
    setCurrentMonth(prev);
  };

  // ================================
  // DERIVED DATA
  // ================================

  const filteredPlan = activeSubject
  ? plan.filter(p => p.subject === activeSubject)
  : plan;

  const progress =
  filteredPlan.length === 0
  ? 0
  : (filteredPlan.filter(t => completed.includes(t.id)).length / filteredPlan.length) * 100

  const today = new Date();
  const calendar = generateCalendar();

  // ================================
  // UI
  // ================================
 
  return(

  
  <div className={`min-h-screen p-10 font-sans transition-colors duration-500 ${
    darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
  }`}>

  {/* HEADER */}
  <motion.h1 
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-3xl font-bold mb-4"
  >
    StudyFlow Planner
  </motion.h1>

   {/* THEME TOGGLE */}
  <motion.button 
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={toggleTheme}
    className="mb-6 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 shadow transition"
  >
    {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
  </motion.button>

       {/* SETUP CARD */}
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    className={`border p-6 rounded-xl mb-8 shadow-lg ${
      darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
    }`}
  >
      <h3 className="text-xl font-semibold mb-4">Setup New Study Plan</h3>

      <input 
      
          placeholder="Enter Subject" 
          value={subject} 
          onChange={(e) => setSubject(e.target.value)} 
            className={`w-full p-2 mb-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 ${
    darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
  }`}
      />

      <textarea 
          placeholder="Enter topics (one per line)" 
          value={topics} 
          onChange={(e) => setTopics(e.target.value)}
          className={`w-full p-2 mb-3 border rounded-lg h-24 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
    darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
  }`}
      />

      <input 
          type="date" 
          value={deadline} 
          onChange={(e) => setDeadline(e.target.value)} 
          className={`w-full p-2 mb-3 border rounded-lg ${
    darkMode ? "bg-gray-800 text-white" : "bg-white text-black"
  }`}
      />
      
      <div className="mb-3">
          <strong>Study Days:</strong><br/>
          <div className="flex flex-wrap gap-2 mt-2">
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
              <motion.button 
                  key={day} 
                  onClick={() => toggleDay(day)}
                  whileTap={{ scale: 0.9 }}
                  className={`px-3 py-1 rounded-md text-sm transition ${
                      days.includes(day) 
                        ? "bg-green-500 text-white" 
                        : "bg-gray-300 text-black"
                  }`}
              >
                  {day.slice(0,3)}
              </motion.button>
          ))}
          </div>
      </div>

      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={generatePlan}
        className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 shadow transition"
      >
          Generate Plan
      </motion.button>
  </motion.div>

  {/* PROGRESS */}
{plan.length > 0 && (
    <div className="mb-6">
        <strong>Progress: {Math.round(progress)}%</strong>

        <div className="w-full bg-gray-300 h-4 rounded-full mt-2 overflow-hidden">
            <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
                className="h-full bg-green-500 rounded-full"
            ></motion.div>
        </div>
    </div>
)}

  {/* VIEW SWITCH BUTTONS */}

<div className="flex gap-3 mb-4">
  <motion.button 
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={()=>setViewMode("list")}
    className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow"
  >
    List View
  </motion.button>

  <motion.button 
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={()=>setViewMode("calendar")}
    className="px-4 py-2 bg-purple-500 text-white rounded-lg shadow"
  >
    Calendar View
  </motion.button>
</div>

  <hr className="my-6 border-gray-400" />


 {/* SUBJECT FILTER */}

<div className="mb-6 flex flex-wrap gap-2">

  <motion.button 
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => setActiveSubject(null)}
    className="px-3 py-1 bg-gray-500 text-white rounded-md"
  >
    All Subjects
  </motion.button>

  {subjects.map((sub, i) => (
    <motion.button 
      key={i} 
      onClick={() => setActiveSubject(sub)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="px-3 py-1 bg-blue-400 text-white rounded-md"
    >
      {sub}
    </motion.button>
  ))}

</div>

  {/* LIST VIEW */}

{viewMode === "list" && (
  filteredPlan.map((task,index)=>{
    return(
      <motion.div 
        key={task.id} 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        className={`border p-4 mb-3 rounded-xl shadow-md ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-300"
        }`}
      >
        <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={completed.includes(task.id)}
              onChange={()=>toggleComplete(task.id)}
            />
            
            {editingIndex === index ? (
              <div className="ml-2 flex-1 flex gap-2">
                <input 
                  className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={editTopic} 
                  onChange={(e) => setEditTopic(e.target.value)} 
                />
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => saveEdit(index)} 
                  className="bg-green-500 text-white px-2 rounded"
                >
                  Save
                </motion.button>
                <button onClick={() => setEditingIndex(null)} className="px-2">
                  Cancel
                </button>
              </div>
            ) : (
              <span className={`ml-2 flex-1 ${
                  completed.includes(task.id) ? "line-through opacity-50" : ""
              }`}>
                  <strong>{task.date}</strong> : {task.topic}
              </span>
            )}

            <div className="flex gap-2">
              <motion.button 
                whileHover={{ scale: 1.2 }}
                onClick={() => { setEditingIndex(index); setEditTopic(task.topic); }} 
                className="cursor-pointer"
              >
                ✏️ Edit
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.2 }}
                onClick={() => deleteTask(task.id)} 
                className="text-red-500 cursor-pointer"
              >
                🗑️ Delete
              </motion.button>
            </div>
        </div>

        <div className="mt-3 pt-3 border-t border-gray-400">
          <button 
            onClick={() => setRescheduleIndex(rescheduleIndex === index ? null : index)} 
            className="text-sm text-blue-400"
          >
            📅 Reschedule
          </button>

          {rescheduleIndex === index && (
              <div className="mt-2 flex gap-2">
                  <input 
                    type="date" 
                    onChange={(e) => setNewDate(e.target.value)} 
                    className="px-2 py-1 border rounded"
                  />
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => saveReschedule(index)} 
                    className="text-sm bg-blue-500 text-white px-2 rounded"
                  >
                    Update Date
                  </motion.button>
              </div>
          )}
        </div>
      </motion.div>
    )
  })
)}

  {/* CALENDAR VIEW */}

{viewMode === "calendar" && (

<div className="mt-8">

<div className="flex justify-between items-center mb-4">

<motion.button 
whileTap={{ scale: 0.9 }}
onClick={prevMonth} 
className="px-4 py-1 bg-gray-500 text-white rounded-lg"
>
◀
</motion.button>

<h2 className="text-xl font-semibold">
{currentMonth.toLocaleString("default",{month:"long"})}
{" "}
{currentMonth.getFullYear()}
</h2>

<motion.button 
whileTap={{ scale: 0.9 }}
onClick={nextMonth} 
className="px-4 py-1 bg-gray-500 text-white rounded-lg"
>
▶
</motion.button>

</div>

<div className="grid grid-cols-7 gap-2">

{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d)=>(
<div key={d} className="text-center font-semibold">
<b>{d}</b>
</div>
))}

{calendar.flat().map((day,index)=>{

if(!day){
return <div key={index}></div>
}

const tasksForDay = filteredPlan.filter(task=>{
const d = new Date(task.full_date || task.date);
return d.getDate() === day &&
d.getMonth() === currentMonth.getMonth() &&
d.getFullYear() === currentMonth.getFullYear();
});

return(

<motion.div 
key={index} 
whileHover={{ scale: 1.05 }}
className={`border min-h-[100px] p-2 rounded-lg ${
darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
}`}
>

<b>{day}</b>

{tasksForDay.map((t,i)=>(
<div 
key={i} 
className="text-xs mt-1 p-1 rounded border-l-4 border-blue-500 bg-blue-100 text-blue-800"
>
{t.topic}
</div>
))}

</motion.div>

)

})}

</div>

</div>

)}
  

  </div>

  );
}

export default App;