import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, Modal, StyleSheet, Alert, TouchableOpacity, ScrollView } from "react-native";
import axios from "axios";
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = "http://localhost:3000/api";  // Make sure this matches your server port

interface CalendarEvent {
  _id?: string; // from MongoDB
  id?: string;  // for local use
  title: string;
  day: string;
  startTime: string;
  endTime: string;
  location?: string;
  color: string;
  type: "event" | "course";
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeSlots = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30",
  "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"
];
const colorOptions = [
  "#00CFFF", "#FF4444", "#44FF44", "#FFD700", "#FF00FF", "#FFA500", "#8888FF", "#FF8888"
];

// Create an axios instance with authentication
const createAuthAxios = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('No token found');
    }

    return axios.create({
      baseURL: BASE_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Auth setup error:', error);
    throw new Error('Authentication failed');
  }
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    day: daysOfWeek[0],
    startTime: timeSlots[0],
    endTime: timeSlots[1],
    location: "",
    color: colorOptions[0]
  });
  const [courseCode, setCourseCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch events from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const authAxios = await createAuthAxios();
        const res = await authAxios.get('/calendar');
        setEvents(res.data.events || []);
      } catch (e) {
        console.error('Failed to fetch calendar:', e);
        Alert.alert("Error", "Failed to load calendar. Please login again.");
      }
    })();
  }, []);

  // Save event
  const saveEvent = async () => {
    if (!newEvent.title) {
      Alert.alert("Please enter a title");
      return;
    }

    try {
      const authAxios = await createAuthAxios();
      if (editId) {
        // Update existing event
        const res = await authAxios.put(`/calendar/${editId}`, {
          ...newEvent,
          type: "event"
        });
        
        if (res.data) {
          setEvents(events.map(e => 
            (e._id === editId || e.id === editId) ? res.data : e
          ));
        }
      } else {
        // Create new event
        const eventToSave = {
          ...newEvent,
          type: "event",
          id: Date.now().toString() // Temporary ID
        };
        
        const updatedEvents = [...events, eventToSave];
        const res = await authAxios.post('/calendar', {
          events: updatedEvents
        });
        
        if (res.data.events) {
          setEvents(res.data.events);
        }
      }

      // Reset form
      setModalVisible(false);
      setEditId(null);
      setNewEvent({
        title: "",
        day: daysOfWeek[0],
        startTime: timeSlots[0],
        endTime: timeSlots[1],
        location: "",
        color: colorOptions[0]
      });
    } catch (err) {
      console.error('Save error:', err);
      Alert.alert("Error", "Failed to save. Please check your login status.");
    }
  };

  // Edit event
  const editEvent = (event: CalendarEvent) => {
    setEditId(event._id || event.id || "");
    setNewEvent({
      title: event.title,
      day: event.day,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location || "",
      color: event.color
    });
    setModalVisible(true);
  };

  // Delete event
  const deleteEvent = async (id: string) => {
    try {
      const authAxios = await createAuthAxios();
      await authAxios.delete(`/calendar/${id}`);
      setEvents(events.filter(e => (e._id || e.id) !== id));
    } catch (e) {
      console.error('Delete error:', e);
      Alert.alert("Error", "Failed to delete event. Please check your login status.");
    }
  };

  // Update the addCourseByCode function
  const addCourseByCode = async (retryCount = 0) => {
    if (!courseCode) {
      Alert.alert("Please enter a course code");
      return;
    }
    
    setLoading(true);
    try {
      const authAxios = await createAuthAxios();
      const res = await authAxios.get(`/timetable/${courseCode}`);
      const schedule = res.data.schedule || [];
      
      if (schedule.length === 0) {
        if (retryCount < 2) {
          // Retry up to 2 times
          console.log(`Retrying search (${retryCount + 1}/2)...`);
          setTimeout(() => addCourseByCode(retryCount + 1), 1000);
          return;
        }
        Alert.alert("No sessions found", "No schedule found for this course code.");
        return;
      }

      // Create calendar events from schedule
      const newCourseEvents = schedule.map((s: any) => ({
        id: Date.now() + Math.random().toString(36),
        title: s.title,
        day: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        color: "#00CFFF",
        type: "course"
    }));

    // Save to backend
    const updatedEvents = [...events, ...newCourseEvents];
    const saveRes = await authAxios.post('/calendar', {
      events: updatedEvents
    });

    if (saveRes.data.events) {
      setEvents(saveRes.data.events);
      setCourseCode("");
      Alert.alert("Success", "Course schedule added successfully!");
    }
  } catch (err) {
    console.error('Course add error:', err);
    if (retryCount < 2) {
      // Retry on error
      console.log(`Retrying after error (${retryCount + 1}/2)...`);
      setTimeout(() => addCourseByCode(retryCount + 1), 1000);
      return;
    }
    Alert.alert(
      "Error",
      "Failed to add course. Please check your connection and try again."
    );
  } finally {
    setLoading(false);
  }
};

  // Render events for a cell
  const renderCellEvents = (day: string, time: string) => {
    return events
      .filter(e => e.day.toLowerCase() === day.toLowerCase() && e.startTime === time)
      .map(e => (
        <TouchableOpacity
          key={e._id || e.id}
          style={[
            styles.eventItem,
            { backgroundColor: e.color }
          ]}
          onLongPress={() => deleteEvent(e._id || e.id!)}
          onPress={() => editEvent(e)}
        >
          <Text style={styles.eventTitle}>{e.title}</Text>
          <Text style={styles.eventTime}>
            {e.startTime} - {e.endTime}
            {e.location ? ` @ ${e.location}` : ""}
          </Text>
          <Text style={styles.eventDeleteHint}>(Long press to delete, tap to edit)</Text>
        </TouchableOpacity>
      ));
  };

  // Custom select component (no libraries)
  const CustomSelect = ({
    label,
    value,
    options,
    onChange,
    style,
    optionStyle
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    style?: any;
    optionStyle?: any;
  }) => {
    const [show, setShow] = useState(false);
    return (
      <View style={{ marginBottom: 8 }}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={[styles.selectBox, style]}
          onPress={() => setShow(!show)}
        >
          <Text style={{ color: "#FFF" }}>{value}</Text>
        </TouchableOpacity>

        <Modal visible={show} transparent animationType="none">
          <TouchableOpacity
            style={styles.dropdownModalOverlay}
            activeOpacity={1}
            onPress={() => setShow(false)}
          >
            <View style={[styles.dropdownContainer, style]}>
              <ScrollView style={{ maxHeight: 200 }} bounces={false}>
                {options.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.selectOption,
                      optionStyle,
                      value === opt && styles.selectedOption
                    ]}
                    onPress={() => {
                      onChange(opt);
                      setShow(false);
                    }}
                  >
                    <View style={[
                      styles.colorPreview,
                      opt.startsWith('#') && { backgroundColor: opt }
                    ]}>
                      <Text style={{ 
                        color: opt.startsWith('#') ? '#000' : '#FFF',
                        textAlign: 'center'
                      }}>
                        {opt}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  return (
    <View style={styles.flexContainer}>
      <View style={styles.calendarContainer}>
        <Text style={styles.header}>Weekly Calendar</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Course Code (e.g. ECC104)"
            value={courseCode}
            onChangeText={setCourseCode}
          />
          <Button title={loading ? "Adding..." : "Add Course"} onPress={() => addCourseByCode()} disabled={loading} />
        </View>
        <Button title="+ Add Event" onPress={() => setModalVisible(true)} />
        
        {/* Main calendar scroll container */}
        <View style={styles.calendarScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <ScrollView showsVerticalScrollIndicator={true}>
              <View style={styles.calendarContent}>
                {/* Calendar Header */}
                <View style={styles.calendarHeaderRow}>
                  <View style={styles.timeColHeader} />
                  {daysOfWeek.map(day => (
                    <View key={day} style={styles.dayColHeader}>
                      <Text style={styles.dayTitle}>{day}</Text>
                    </View>
                  ))}
                </View>
                {/* Calendar Grid */}
                {timeSlots.map(time => (
                  <View key={time} style={styles.calendarRow}>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeText}>{time}</Text>
                    </View>
                    {daysOfWeek.map(day => (
                      <View key={day} style={styles.cell}>
                        {renderCellEvents(day, time)}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          </ScrollView>
        </View>
      </View>
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>{editId ? "Edit Event" : "New Event"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={newEvent.title}
              onChangeText={text => setNewEvent({ ...newEvent, title: text })}
            />
            <CustomSelect
              label="Day"
              value={newEvent.day}
              options={daysOfWeek}
              onChange={v => setNewEvent({ ...newEvent, day: v })}
            />
            <CustomSelect
              label="Start Time"
              value={newEvent.startTime}
              options={timeSlots}
              onChange={v => setNewEvent({ ...newEvent, startTime: v })}
            />
            <CustomSelect
              label="End Time"
              value={newEvent.endTime}
              options={timeSlots}
              onChange={v => setNewEvent({ ...newEvent, endTime: v })}
            />
            <CustomSelect
              label="Color"
              value={newEvent.color}
              options={colorOptions}
              onChange={v => setNewEvent({ ...newEvent, color: v })}
              optionStyle={{ padding: 8 }}
            />
            <TextInput
              style={styles.input}
              placeholder="Location (optional)"
              value={newEvent.location}
              onChangeText={text => setNewEvent({ ...newEvent, location: text })}
            />
            <Button title={editId ? "Save Changes" : "Save"} onPress={saveEvent} />
            <Button title="Cancel" color="#888" onPress={() => { setModalVisible(false); setEditId(null); }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: "#181818",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  calendarContainer: {
    backgroundColor: "#222",
    borderRadius: 16,
    padding: 8,
    marginVertical: 8,
    alignItems: "center",
    flex: 1,
    width: '100%'
  },
  header: { color: "#00CFFF", fontWeight: "bold", fontSize: 22, marginBottom: 10, textAlign: "center" },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  input: { backgroundColor: "#333", color: "#FFF", borderRadius: 6, padding: 8, minWidth: 80, marginRight: 8, flex: 1 },
  label: { color: "#FFF", marginTop: 8, marginBottom: 2 },
  calendarHeaderRow: { flexDirection: "row", marginBottom: 2 },
  dayColHeader: {
    minWidth: 120, // Match cell width
    alignItems: "center",
    padding: 8,
    backgroundColor: '#2A2A2A'
  },
  timeColHeader: {
    width: 60, // Match time column width
    backgroundColor: '#2A2A2A'
  },
  calendarRow: { flexDirection: "row", minHeight: 32 },
  timeCol: {
    width: 60, // Slightly wider time column
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderColor: "#333",
    backgroundColor: '#2A2A2A'
  },
  timeText: { color: "#AAA", fontSize: 12 },
  cell: {
    flex: 1,
    minHeight: 32,
    minWidth: 120, // Ensure cells have minimum width
    borderWidth: 1,
    borderColor: "#222",
    padding: 4,
    justifyContent: "center"
  },
  dayTitle: { color: "#FFF", fontWeight: "bold", fontSize: 13, textAlign: "center" },
  eventItem: { borderRadius: 6, padding: 2, marginBottom: 1 },
  eventTitle: { color: "#181818", fontWeight: "bold", fontSize: 11 },
  eventTime: { color: "#181818", fontSize: 10 },
  eventDeleteHint: { color: "#FF4444", fontSize: 9 },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#222", borderRadius: 12, padding: 20, width: "80%" },
  modalHeader: { color: "#00CFFF", fontWeight: "bold", fontSize: 18, marginBottom: 10, textAlign: "center" },
  selectBox: {
    backgroundColor: "#333",
    borderRadius: 6,
    padding: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#444",
    zIndex: 101,
  },
  selectDropdownAbsolute: {
    position: "absolute",
    top: 38,
    left: 0,
    right: 0,
    backgroundColor: "#222",
    borderRadius: 8,
    maxHeight: 180,
    zIndex: 99999,
    elevation: 30,
    overflow: "hidden",
    alignSelf: "center",
  },
  selectDropdownScroll: {
    width: "100%",
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 4,
    width: '60%',
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  selectOption: {
    padding: 12,
    borderRadius: 4,
  },
  selectedOption: {
    backgroundColor: '#444',
  },
  colorPreview: {
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  calendarScrollContainer: {
    flex: 1,
    marginTop: 10,
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    overflow: 'hidden'
  },
  
  calendarContent: {
    minWidth: daysOfWeek.length * 120, // Ensure minimum width for all days
    paddingBottom: 20 // Add some padding at the bottom
  },
});