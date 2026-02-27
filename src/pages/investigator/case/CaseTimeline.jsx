import { FileText } from "lucide-react";

const CaseTimeline = () => {
    const timelineData = [
        { id: 1, text: "Initial suspect interviews conducted.", date: "16 Dec 2025", time: "3:00 PM" },
        { id: 2, text: "Police notified; crime scene secured.", date: "15 Dec 2025", time: "11:00 PM" },
        { id: 3, text: "CCTV footage recovered from nearby streets.", date: "16 Dec 2025", time: "12:00 PM" },
        { id: 4, text: "Victim found stabbed by family member.", date: "15 Dec 2025", time: "10:45 PM" },
        { id: 5, text: "CCTV footage recovered (alternate view).", date: "16 Dec 2025", time: "10:00 AM" },
        { id: 6, text: "Neighbors report hearing loud argument.", date: "15 Dec 2025", time: "10:30 PM" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {timelineData.map((item) => (
                <div key={item.id} className={`${item.id%3 === 0 ? "bg-crimson-red" : item.id%3 === 1 ? "bg-emerald-green" : "bg-amber-gold"} text-white p-5 rounded-lg flex items-start gap-4 shadow-md`}>
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