import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Dimensions,
  Animated,
  Easing,
} from "react-native";
import axios from "axios";
import { useSelector } from "react-redux";
import { RootState } from "../store/store";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";


type BlockType = "header" | "paragraph" | "code" | "table" | "image" | "ai" | "line";

interface TableData {
  rows: string[][];
}
interface ImageData { uri: string; }
interface ContentBlock {
  _id: string;
  type: BlockType;
  content: string | TableData | ImageData;
  fontSize: number;
  color: string;
}
interface Solin {
  _id: string;
  title: string;
  contentBlocks: ContentBlock[];
}
const BASE_URL = "http://localhost:3000/api";
const FONT_SIZES = [8, 12, 16, 18, 24, 32, 40, 50, 60, 72];
const COLOR_PRESETS = [
  "#FFFFFF", "#00CFFF", "#4CAF50", "#FFC107", "#FF5722", "#E91E63", "#9C27B0", "#FF6B6B",
  "#19b8f6", "#00FF00", "#FFD700", "#FF1493", "#00FFFF", "#FF69B4", "#32CD32", "#BA55D3"
];

const getDefaultBlockProperties = (type: BlockType): Pick<ContentBlock, 'fontSize' | 'color'> => {
  switch (type) {
    case 'header':
      return { fontSize: 28, color: '#FFFFFF' };
    case 'code':
      return { fontSize: 14, color: '#00FF00' };
    case 'line':
      return { fontSize: 1, color: '#444' };
    default:
      return { fontSize: 16, color: '#FFFFFF' };
  }
};



export default function SolinPage() {
  // 1. Get URL params and router
  const { solinId } = useLocalSearchParams<{ solinId: string }>();
  const router = useRouter();

  // 2. Redux selectors
  const authToken = useSelector((state: RootState) => state.auth.token);
  const loading = useSelector((state: RootState) => state.auth.loading);

  // 3. All useState hooks grouped together
  const [solin, setSolin] = useState<Solin | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; insertAt: number }>({
    top: 0,
    left: 0,
    insertAt: 0
  });
  const [blockHeights, setBlockHeights] = useState<{ [key: string]: number }>({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [activeColorBlock, setActiveColorBlock] = useState<number | null>(null);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const [activeFontSizeBlock, setActiveFontSizeBlock] = useState<number | null>(null);

  // --- Courses for AI ---
  const [userCourses, setUserCourses] = useState<string[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  // 4. useRef hooks
  const colorAnim = useRef(new Animated.Value(0)).current;

  // 5. All useEffect hooks grouped together
  // Auth check effect
  useEffect(() => {
    if (!loading && !authToken) {
      router.replace("/a-pages/login");
    }
  }, [loading, authToken, router]);

  // Fetch data effect
  useEffect(() => {
    if (!loading && authToken && solinId) fetchSolin();
  }, [loading, authToken, solinId]);

  // Animation effect
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
          easing: Easing.linear
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
          easing: Easing.linear
        }),
      ])
    ).start();
  }, [colorAnim]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      setSaving(false);
      setAiLoading(false);
      setShowBlockMenu(false);
      setShowColorPicker(false);
      setShowFontSizeMenu(false);
    };
  }, []);

  // Courses effect
  useEffect(() => {
    const fetchCourses = async () => {
      if (!authToken) return;
      try {
        const res = await axios.get(`${BASE_URL}/user/courses`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setUserCourses(res.data.courses || []);
        if (res.data.courses && res.data.courses.length > 0) {
          setSelectedCourse(res.data.courses[0]);
        }
      } catch (err) {
        console.error('Failed to fetch user courses:', err);
      }
    };
    fetchCourses();
  }, [authToken]);

  const headerColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#00CFFF", "#4caf50"],
  });

  const fetchSolin = async () => {
    if (!authToken || !solinId) return;
    try {
      const res = await axios.get(`${BASE_URL}/documents/${solinId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const blocks = (res.data.contentBlocks || []).map((b: any) => ({
        _id: b._id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: b.type,
        content: b.content,
        fontSize: b.fontSize || getDefaultBlockProperties(b.type).fontSize,
        color: b.color || getDefaultBlockProperties(b.type).color
      }));
      setSolin({ ...res.data, contentBlocks: blocks });
    } catch (error) {
      console.error('Fetch error:', error);
      Alert.alert("Error", "Failed to load Solin.");
    }
  };

  // Update the saveSolin function
  const saveSolin = async (blocks: ContentBlock[]) => {
    if (!solin || !authToken || !solinId) return;
    setSaving(true);
    try {
      const processedBlocks = blocks.map(block => ({
        _id: block._id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: block.type,
        content: block.content,
        fontSize: block.fontSize || getDefaultBlockProperties(block.type).fontSize,
        color: block.color || getDefaultBlockProperties(block.type).color
      }));

      const response = await axios.put(
        `${BASE_URL}/documents/${solinId}/content`,
        {
          contentBlocks: processedBlocks,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (response.data.success) {
        setSolin(prev => prev ? {
          ...prev,
          contentBlocks: processedBlocks
        } : null);
      }
    } catch (error: any) {
      console.error('Save error:', error);
      if (error.response?.status === 403) {
        Alert.alert("Error", "You don't have permission to edit this Solin.");
      } else {
        Alert.alert("Error", "Failed to save changes.");
      }
    } finally {
      setSaving(false);
    }
  };

  const addBlockAt = (type: BlockType, insertAt: number) => {
    if (!solin) return;
    const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const defaults = getDefaultBlockProperties(type);
    let newBlock: ContentBlock;
    if (type === "table") {
      newBlock = { _id: newId, type, content: { rows: [[""], [""]] }, ...defaults };
    } else if (type === "line") {
      newBlock = { _id: newId, type, content: "", ...defaults };
    } else {
      newBlock = { _id: newId, type, content: "", ...defaults };
    }
    const updatedBlocks = [
      ...solin.contentBlocks.slice(0, insertAt),
      newBlock,
      ...solin.contentBlocks.slice(insertAt)
    ];
    setSolin({ ...solin, contentBlocks: updatedBlocks });
    saveSolin(updatedBlocks);
    setShowBlockMenu(false);
  };

  const pickImageAt = async (insertAt: number) => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      let file: any;
      if (asset.uri.startsWith("data:")) {
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        file = new File([blob], "photo.jpg", { type: blob.type });
      } else {
        file = {
          uri: asset.uri,
          name: "photo.jpg",
          type: "image/jpeg",
        };
      }
      try {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("http://localhost:3000/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadJson.file || !uploadJson.file.url) throw new Error("No URL returned from upload");
        addImageBlockAt(uploadJson.file.url, insertAt);
      } catch (err) {
        Alert.alert("Upload failed", "Could not upload image.");
      }
    }
    setShowBlockMenu(false);
  };

  const addImageBlockAt = (url: string, insertAt: number) => {
    if (!solin) return;
    const newBlock: ContentBlock = { type: "image", content: { uri: url }, _id: `${Date.now()}-img`, fontSize: 16, color: "#FFFFFF" };
    const updatedBlocks = [
      ...solin.contentBlocks.slice(0, insertAt),
      newBlock,
      ...solin.contentBlocks.slice(insertAt),
    ];
    setSolin({ ...solin, contentBlocks: updatedBlocks });
    saveSolin(updatedBlocks);
  };

  // --- Table logic ---
  const renderTableBlock = (block: ContentBlock, index: number) => {
    const table = block.content as TableData;
    return (
      <View key={index} style={{ marginBottom: 16 }}>
        {table.rows.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: "row" }}>
            {row.map((cell, colIdx) => (
              <TextInput
                key={colIdx}
                value={cell}
                onChangeText={text => updateTableCell(index, rowIdx, colIdx, text)}
                style={{ borderWidth: 1, borderColor: "#ccc", padding: 4, minWidth: 40, color: "#FFF" }}
              />
            ))}
          </View>
        ))}
        <View style={{ flexDirection: "row", marginTop: 4 }}>
          <Button title="Row" onPress={() => addTableRow(index)} />
          <Button title="Col" onPress={() => addTableCol(index)} />
        </View>
      </View>
    );
  };

  const updateTableCell = (blockIdx: number, rowIdx: number, colIdx: number, text: string) => {
    if (!solin) return;
    const blocks = [...solin.contentBlocks];
    const table = blocks[blockIdx].content as TableData;
    table.rows[rowIdx][colIdx] = text;
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  const addTableRow = (blockIdx: number) => {
    if (!solin) return;
    const blocks = [...solin.contentBlocks];
    const table = blocks[blockIdx].content as TableData;
    const cols = table.rows[0]?.length || 1;
    table.rows.push(Array(cols).fill(""));
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  const addTableCol = (blockIdx: number) => {
    if (!solin) return;
    const blocks = [...solin.contentBlocks];
    const table = blocks[blockIdx].content as TableData;
    table.rows.forEach(row => row.push(""));
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  // --- AI Block ---
  const generateAIContent = async (blockIdx: number) => {
    if (!solin) return;
    const block = solin.contentBlocks[blockIdx];
    if (typeof block.content !== "string" || !block.content.trim()) {
      Alert.alert("Error", "Please enter a prompt for AI.");
      return;
    }
    setAiLoading(true);
    try {
      const res = await axios.post(
        `${BASE_URL}/ai/${solinId}/aiGenerate`,
        {
          prompt: block.content,
          courseCode: selectedCourse,
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      
      // Get the generated paragraph block
      const generatedBlock = res.data.document.contentBlocks[res.data.document.contentBlocks.length - 1];
      
      // Update the current block to be a paragraph with the AI response
      const blocks = [...solin.contentBlocks];
      blocks[blockIdx] = {
        ...blocks[blockIdx],
        type: "paragraph",
        content: generatedBlock.content,
        fontSize: 16,
        color: "#FFF",
      };
      
      setSolin({ ...solin, contentBlocks: blocks });
      saveSolin(blocks);
    } catch (err) {
      Alert.alert("Error", "Failed to generate AI content.");
    } finally {
      setAiLoading(false);
    }
  };

  const deleteBlock = (idx: number) => {
    if (!solin) return;
    const blocks = solin.contentBlocks.filter((_, i) => i !== idx);
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  const handleShowMenu = (insertAt: number, y: number, x: number) => {
    setMenuPosition({ top: Math.max(y-200,300), left: x+25, insertAt });
    setShowBlockMenu(true);
  };

  const moveBlock = (from: number, to: number) => {
    if (!solin) return;
    if (to < 0 || to >= solin.contentBlocks.length) return;
    const blocks = [...solin.contentBlocks];
    const [removed] = blocks.splice(from, 1);
    blocks.splice(to, 0, removed);
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  const updateTextBlock = (index: number, text: string) => {
    if (!solin) return;
    const blocks = [...solin.contentBlocks];
    blocks[index].content = text;
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  const updateTextFontSize = (index: number, size: number) => {
    if (!solin) return;
    const blocks = [...solin.contentBlocks];
    blocks[index].fontSize = size;
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  const updateTextColor = (index: number, color: string) => {
    if (!solin) return;
    const blocks = [...solin.contentBlocks];
    blocks[index].color = color;
    setSolin({ ...solin, contentBlocks: blocks });
    saveSolin(blocks);
  };

  const handleContentSizeChange = (key: string, event: any) => {
    const height = event.nativeEvent.contentSize.height;
    setBlockHeights(prev => ({ ...prev, [key]: height }));
  };

  const ColorPickerModal = () => (
    <Modal
      visible={showColorPicker}
      transparent
      animationType="fade"
      onRequestClose={() => setShowColorPicker(false)}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        onPress={() => setShowColorPicker(false)}
        activeOpacity={1}
      >
        <View style={styles.colorPickerContainer}>
          <Text style={styles.colorPickerTitle}>Select Color</Text>
          <View style={styles.presetColorsContainer}>
            {COLOR_PRESETS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.presetColorBtn,
                  { backgroundColor: color },
                  activeColorBlock !== null &&
                  solin?.contentBlocks[activeColorBlock]?.color === color &&
                  styles.presetColorBtnActive
                ]}
                onPress={() => {
                  if (activeColorBlock !== null) {
                    updateTextColor(activeColorBlock, color);
                  }
                }}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.colorPickerDoneBtn}
            onPress={() => setShowColorPicker(false)}
          >
            <Text style={styles.colorPickerDoneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const FontSizeModal = () => (
    <Modal
      visible={showFontSizeMenu}
      transparent
      animationType="fade"
      onRequestClose={() => setShowFontSizeMenu(false)}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        onPress={() => setShowFontSizeMenu(false)}
        activeOpacity={1}
      >
        <View style={[
          styles.fontSizeMenu,
          {
            position: 'absolute',
            top: menuPosition.top,
            left: menuPosition.left,
          }
        ]}>
          <ScrollView style={{ maxHeight: 200 }}>
            {FONT_SIZES.map(size => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.fontSizeMenuItem,
                  activeFontSizeBlock !== null &&
                  solin?.contentBlocks[activeFontSizeBlock]?.fontSize === size &&
                  styles.fontSizeMenuItemActive
                ]}
                onPress={() => {
                  if (activeFontSizeBlock !== null) {
                    updateTextFontSize(activeFontSizeBlock, size);
                    setShowFontSizeMenu(false);
                  }
                }}
              >
                <Text style={[
                  styles.fontSizeMenuItemText,
                  activeFontSizeBlock !== null &&
                  solin?.contentBlocks[activeFontSizeBlock]?.fontSize === size &&
                  styles.fontSizeMenuItemTextActive
                ]}>
                  {size}px
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  if (loading || !authToken || !solin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  const renderItem = ({ item, index }: { item: ContentBlock; index: number }) => (
    <View key={item._id} style={styles.cellContainer}>
      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteBlock(index)}
        activeOpacity={0.7}
      >
        <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "bold" }}>✕</Text>
      </TouchableOpacity>

      {/* Add button */}
      <TouchableOpacity
        style={styles.addBtn}
        onPress={event => {
          const { pageY, pageX } = event.nativeEvent;
          handleShowMenu(index + 1, pageY, pageX);
        }}
        activeOpacity={0.7}
      >
        <Text style={{ color: "#FFF", fontSize: 32, fontWeight: "bold" }}>+</Text>
      </TouchableOpacity>

      {/* Move buttons */}
      <TouchableOpacity style={styles.moveUpBtn} onPress={() => moveBlock(index, index - 1)} disabled={index === 0}>
        <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "bold" }}>↑</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.moveDownBtn} onPress={() => moveBlock(index, index + 1)} disabled={index === solin.contentBlocks.length - 1}>
        <Text style={{ color: "#FFF", fontSize: 20, fontWeight: "bold" }}>↓</Text>
      </TouchableOpacity>

      {/* Main content */}
      {(item.type === "header" || item.type === "paragraph" || item.type === "ai") && (
        <View>
          <TextInput
            value={item.content as string}
            onChangeText={text => {
              const blocks = [...solin!.contentBlocks];
              blocks[index] = { ...blocks[index], content: text };
              setSolin({ ...solin!, contentBlocks: blocks });
            }}
            onBlur={() => {
              if (solin) saveSolin(solin.contentBlocks);
            }}
            style={{
              color: item.color,
              fontSize: item.fontSize,
              fontWeight: item.type === "header" ? "bold" : "normal",
              backgroundColor: "#121212",
              borderRadius: 8,
              padding: 8,
              textAlignVertical: 'top',
              height: blockHeights[item._id] || (item.fontSize ? item.fontSize * 2 : 32),
              minHeight: 40,
            }}
            placeholder={
              item.type === "header"
                ? "Header"
                : item.type === "ai"
                ? "Ask AI to generate content for this Solin..."
                : "Paragraph"
            }
            multiline
            blurOnSubmit={false}
            onContentSizeChange={e => handleContentSizeChange(item._id, e)}
          />
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            {item.type === "ai" && (
              <TouchableOpacity
                style={[styles.formatButton, aiLoading && { opacity: 0.5 }]}
                onPress={() => generateAIContent(index)}
                disabled={aiLoading}
              >
                <Text style={styles.formatButtonText}>
                  {aiLoading ? "Generating..." : "Generate"}
                </Text>
              </TouchableOpacity>
            )}

            {/* New Font Size Button */}
            <TouchableOpacity
              style={[styles.formatButton]}
              onPress={(event) => {
                const { pageX, pageY } = event.nativeEvent;
                setMenuPosition({
                  left: pageX - 20,
                  top: pageY - 220,
                  insertAt: index
                });
                setActiveFontSizeBlock(index);
                setShowFontSizeMenu(true);
              }}
            >
              <Text style={styles.formatButtonText}>{item.fontSize}px</Text>
            </TouchableOpacity>

            {/* Color Button */}
            <TouchableOpacity
              style={[styles.colorBtn, { backgroundColor: item.color }]}
              onPress={() => {
                setActiveColorBlock(index);
                setShowColorPicker(true);
              }}
            >
              <Text style={styles.colorBtnText}>Color</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Code block */}
      {item.type === "code" && (
        <TextInput
          value={item.content as string}
          onChangeText={text => updateTextBlock(index, text)}
          style={{
            color: item.color || "#19b8f6",
            fontSize: item.fontSize || 14,
            backgroundColor: "#121212",
            borderRadius: 8,
            padding: 8,
            fontFamily: "monospace",
            textAlignVertical: 'top',
            height: blockHeights[item._id] || 40,
          }}
          placeholder="Code snippet"
          multiline
          onContentSizeChange={e => handleContentSizeChange(item._id, e)}
        />
      )}

      {/* Table block */}
      {item.type === "table" && renderTableBlock(item, index)}

      {/* Image block */}
      {item.type === "image" && (
        <Image
          source={{ uri: (item.content as ImageData).uri }}
          style={{ width: 200, height: 200, borderRadius: 12, marginVertical: 8 }}
        />
      )}

      {/* Line block */}
      {item.type === "line" && (
        <View style={styles.lineBlock} />
      )}
    </View>
  );

  return (
    <View style={styles.bg}>
      <Animated.Text style={[styles.title, { color: headerColor }]}>
        {solin.title}
      </Animated.Text>
      <Animated.View style={[styles.animatedLine, { backgroundColor: headerColor }]} />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* --- Course Selection for AI --- */}
        {userCourses.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: '#FFF', marginBottom: 4 }}>Select Course Context:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {/* Option for no course context */}
              <TouchableOpacity
                key="no-context"
                style={{
                  backgroundColor: selectedCourse === "" ? '#00CFFF' : '#232323',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 8,
                  marginRight: 8,
                  marginBottom: 8,
                }}
                onPress={() => setSelectedCourse("")}
              >
                <Text style={{ color: selectedCourse === "" ? '#121212' : '#FFF' }}>
                  No Course Context
                </Text>
              </TouchableOpacity>
              {userCourses.map((course) => (
                <TouchableOpacity
                  key={course}
                  style={{
                    backgroundColor: selectedCourse === course ? '#00CFFF' : '#232323',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  onPress={() => setSelectedCourse(course)}
                >
                  <Text style={{ color: selectedCourse === course ? '#121212' : '#FFF' }}>{course}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {solin.contentBlocks.map((item, index) => (
          <View key={item._id} style={{ width: "100%" }}>
            {renderItem({ item, index })}
          </View>
        ))}
      </ScrollView>
      {solin.contentBlocks.length === 0 && (
        <TouchableOpacity
          style={[styles.emptyStateAddBtn]}
          onPress={event => {
            const { pageY, pageX } = event.nativeEvent;
            handleShowMenu(0, pageY, pageX);
          }}
        >
          <Text style={styles.emptyStateAddBtnText}>+</Text>
        </TouchableOpacity>
      )}
      <View style={styles.buttonRow}>
        <Button
          title={saving ? "Saving..." : "Save"}
          onPress={() => solin && saveSolin(solin.contentBlocks)}
          color="#4caf50"
          disabled={saving}
        />
      </View>
      <Modal
        visible={showBlockMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBlockMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          onPress={() => setShowBlockMenu(false)}
          activeOpacity={1}
        >
          <View
            style={[
              styles.menuSheetSmall,
              {
                position: "absolute",
                top: Math.min(menuPosition.top, Dimensions.get("window").height - 180),
                left: Math.min(menuPosition.left, Dimensions.get("window").width - 180),
              },
            ]}
          >
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
              <TouchableOpacity style={styles.menuBtn} onPress={() => addBlockAt("header", menuPosition.insertAt)}>
                <Text style={styles.menuBtnText}>H</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => addBlockAt("paragraph", menuPosition.insertAt)}>
                <Text style={styles.menuBtnText}>P</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => addBlockAt("code", menuPosition.insertAt)}>
                <Text style={styles.menuBtnText}>{"</>"}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => addBlockAt("table", menuPosition.insertAt)}>
                <Text style={styles.menuBtnText}>Tbl</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => pickImageAt(menuPosition.insertAt)}>
                <Text style={styles.menuBtnText}>Img</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => addBlockAt("ai", menuPosition.insertAt)}>
                <Text style={styles.menuBtnText}>AI</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuBtn} onPress={() => addBlockAt("line", menuPosition.insertAt)}>
                <Text style={styles.menuBtnText}>Line</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      <ColorPickerModal />
      <FontSizeModal />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 36,
  },
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#121212",
    paddingBottom: 80,
  },
  title: {
    fontSize: 35,
    fontWeight: "bold",
    marginBottom: 8,
    alignSelf: "center",
    letterSpacing: 1,
  },
  animatedLine: {
    height: 4,
    width: "100%",
    alignSelf: "center",
    borderRadius: 2,
    marginBottom: 18,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 20,
    marginRight: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  cellContainer: {
    backgroundColor: "#121212",
    borderRadius: 16,
    marginBottom: 32,
    padding: 16,
    width: '100%',
    position: 'relative',
  },
  addBtn: {
    position: "absolute",
    right: 5,
    bottom: 5,
    zIndex: 10,
    backgroundColor: "transparent",
    borderRadius: 20,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00CFFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    opacity: 0.3,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  menuSheetSmall: {
    backgroundColor: "#222",
    padding: 10,
    borderRadius: 12,
    width: 170,
    elevation: 10,
    zIndex: 100,
  },
  menuBtn: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },
  menuBtnText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  deleteBtn: {
    position: "absolute",
    right: 5,
    top: 5,
    zIndex: 10,
    borderRadius: 20,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ff6b6b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
    opacity: 0.3,
  },
  formatButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#333",
    marginRight: 8,
  },
  formatButtonActive: {
    backgroundColor: "#00CFFF",
  },
  formatButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  moveUpBtn: {
    position: "absolute",
    left: "50%",
    top: 0,
    zIndex: 100,
    backgroundColor: "transparent",
    borderRadius: 20,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 4,
    opacity: 0.3,
  },
  moveDownBtn: {
    position: "absolute",
    left: "50%",
    bottom: -20,
    zIndex: 100,
    backgroundColor: "transparent",
    borderRadius: 20,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 4,
    opacity: 0.3,
  },
  emptyStateAddBtn: {
    alignSelf: "center",
    marginTop: 40,
    backgroundColor: "#333",
    borderRadius: 30,
    width: 60,
    height: 60,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  emptyStateAddBtnText: {
    color: "#FFF",
    fontSize: 40,
    fontWeight: "bold",
  },
  fontSizeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#222',
    marginRight: 4,
    minWidth: 32,
    alignItems: 'center',
  },
  fontSizeBtnActive: {
    backgroundColor: '#00CFFF',
  },
  fontSizeBtnText: {
    color: '#FFF',
    fontSize: 12,
  },
  fontSizeBtnTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  colorPickerContainer: {
    backgroundColor: '#222',
    padding: 20,
    borderRadius: 12,
    width: 300,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  colorPickerTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  colorPickerDoneBtn: {
    backgroundColor: '#00CFFF',
    padding: 10,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  colorPickerDoneBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16,
  },
  colorBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  colorBtnText: {
    color: '#FFF',
    fontSize: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  presetColorsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  presetColorBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 4,
  },
  presetColorBtnActive: {
    borderWidth: 2,
    borderColor: '#00CFFF',
  },
  wheelPickerContainer: {
    alignItems: 'center',
  },
  fontSizeMenu: {
    width: 80,
    backgroundColor: '#222',
    padding: 4,
    borderRadius: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    maxHeight: 200,
    zIndex: 1000,
  },
  fontSizeMenuItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginVertical: 1,
  },
  fontSizeMenuItemActive: {
    backgroundColor: '#00CFFF',
  },
  fontSizeMenuItemText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
  },
  fontSizeMenuItemTextActive: {
    color: '#000',
    fontWeight: 'bold',
  },
  blockContainer: {
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    position: "relative",
  },
  blockInput: {
    color: "#FFFFFF",
    fontSize: 16,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#2c2c2c",
    marginBottom: 8,
    minHeight: 40,
    textAlignVertical: "top",
  },
  blockControls: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  blockButton: {
    backgroundColor: "#333",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  buttonText: {
    color: "#FFF",
    fontWeight: "bold",
    textAlign: "center",
  },
  lineBlock: {
    height: 2,
    backgroundColor: "#444",
    marginVertical: 16,
    borderRadius: 2,
    width: "100%",
  },
});