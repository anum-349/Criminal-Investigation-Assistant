import { FileText } from "lucide-react";

const CaseTimeline = () => {
    const timelineData = [
        { id: 1, text: "Initial suspect interviews conducted.", date: "16 Dec 2025", time: "3:00 PM", color: "bg-amber-600" },
        { id: 2, text: "Police notified; crime scene secured.", date: "15 Dec 2025", time: "11:00 PM", color: "bg-indigo-600" },
        { id: 3, text: "CCTV footage recovered from nearby streets.", date: "16 Dec 2025", time: "12:00 PM", color: "bg-emerald-600" },
        { id: 4, text: "Victim found stabbed by family member.", date: "15 Dec 2025", time: "10:45 PM", color: "bg-rose-700" },
        { id: 5, text: "CCTV footage recovered (alternate view).", date: "16 Dec 2025", time: "10:00 AM", color: "bg-purple-600" },
        { id: 6, text: "Neighbors report hearing loud argument.", date: "15 Dec 2025", time: "10:30 PM", color: "bg-orange-700" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {timelineData.map((item) => (
                <div key={item.id} className={`${item.color} text-white p-5 rounded-lg flex items-start gap-4 shadow-md`}>
                    <div className="mt-1 p-1 border-2 border-white rounded">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">{item.text}</h4>
                        <p className="text-xs opacity-90 mt-1">{item.date} – {item.time}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default CaseTimeline;