import { ChatInterface } from "@/components/chat/ChatInterface";

const StudentChats = () => {
  return (
    <div className="h-screen">
      <ChatInterface userRole="student" />
    </div>
  );
};

export default StudentChats;
