import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [realtimeAttendance, setRealtimeAttendance] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const newSocket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
      if (user.role === 'admin') {
        newSocket.emit('join:admin');
      }
      newSocket.emit('join:user', user._id);
    });

    newSocket.on('attendance:new', (data) => {
      if (user.role === 'manager') {
        const empDept = data.attendance?.userId?.department;
        if (empDept && empDept !== user.department) {
          return;
        }
      }
      setRealtimeAttendance(prev => [data, ...prev].slice(0, 50));
    });

    newSocket.on('notification:new', (data) => {
      setNotifications(prev => [data, ...prev]);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const clearRealtimeAttendance = () => setRealtimeAttendance([]);
  
  const addInitialNotifications = (initial) => setNotifications(initial);

  return (
    <SocketContext.Provider value={{ socket, realtimeAttendance, clearRealtimeAttendance, notifications, addInitialNotifications, setNotifications }}>
      {children}
    </SocketContext.Provider>
  );
};
