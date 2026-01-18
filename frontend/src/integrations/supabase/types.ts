export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      robot_images: {
        Row: {
          caption: string | null
          created_at: string | null
          display_order: number | null
          id: string
          image_type: Database["public"]["Enums"]["robot_image_type"]
          image_url: string
          robot_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type?: Database["public"]["Enums"]["robot_image_type"]
          image_url: string
          robot_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          image_type?: Database["public"]["Enums"]["robot_image_type"]
          image_url?: string
          robot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "robot_images_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: false
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      robot_specifications: {
        Row: {
          created_at: string | null
          id: string
          mounting_options: string[] | null
          operating_temperature_range: string | null
          power_consumption: number | null
          protection_rating: string | null
          robot_id: string
          speed_data: Json | null
          updated_at: string | null
          working_envelope_data: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mounting_options?: string[] | null
          operating_temperature_range?: string | null
          power_consumption?: number | null
          protection_rating?: string | null
          robot_id: string
          speed_data?: Json | null
          updated_at?: string | null
          working_envelope_data?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mounting_options?: string[] | null
          operating_temperature_range?: string | null
          power_consumption?: number | null
          protection_rating?: string | null
          robot_id?: string
          speed_data?: Json | null
          updated_at?: string | null
          working_envelope_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "robot_specifications_robot_id_fkey"
            columns: ["robot_id"]
            isOneToOne: true
            referencedRelation: "robots"
            referencedColumns: ["id"]
          },
        ]
      }
      robots: {
        Row: {
          arm_weight_kg: number | null
          created_at: string
          datasheet_url: string | null
          description: string | null
          gripper_open: boolean
          id: string
          image_url: string | null
          is_active: boolean | null
          last_updated: string
          manufacturer: string | null
          model: string | null
          name: string
          number_of_axes: number | null
          owner_id: string | null
          payload_kg: number | null
          reach_mm: number | null
          repeatability_mm: number | null
          specifications: Json | null
          urdf_data: Json | null
          x_coordinate: number
          y_coordinate: number
          z_coordinate: number
        }
        Insert: {
          arm_weight_kg?: number | null
          created_at?: string
          datasheet_url?: string | null
          description?: string | null
          gripper_open?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_updated?: string
          manufacturer?: string | null
          model?: string | null
          name: string
          number_of_axes?: number | null
          owner_id?: string | null
          payload_kg?: number | null
          reach_mm?: number | null
          repeatability_mm?: number | null
          specifications?: Json | null
          urdf_data?: Json | null
          x_coordinate?: number
          y_coordinate?: number
          z_coordinate?: number
        }
        Update: {
          arm_weight_kg?: number | null
          created_at?: string
          datasheet_url?: string | null
          description?: string | null
          gripper_open?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          last_updated?: string
          manufacturer?: string | null
          model?: string | null
          name?: string
          number_of_axes?: number | null
          owner_id?: string | null
          payload_kg?: number | null
          reach_mm?: number | null
          repeatability_mm?: number | null
          specifications?: Json | null
          urdf_data?: Json | null
          x_coordinate?: number
          y_coordinate?: number
          z_coordinate?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      robot_image_type:
        | "primary"
        | "datasheet"
        | "working_envelope"
        | "dimensional"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      robot_image_type: [
        "primary",
        "datasheet",
        "working_envelope",
        "dimensional",
        "other",
      ],
    },
  },
} as const
