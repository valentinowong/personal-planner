import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { usePlannerStyles } from "./PlannerStylesContext";

type PlannerIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
};

export function PlannerIconButton({ icon, onPress, disabled }: PlannerIconButtonProps) {
  const styles = usePlannerStyles();
  const { colors } = useTheme();
  return (
    <Pressable style={[styles.iconButton, disabled && styles.iconButtonDisabled]} onPress={!disabled ? onPress : undefined}>
      <Ionicons name={icon} size={16} color={disabled ? colors.textMuted : colors.text} />
    </Pressable>
  );
}
