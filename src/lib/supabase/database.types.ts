export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          changed_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        ComputedFields: never
        Insert: {
          action: string
          changed_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mariage_enfants: {
        Row: {
          created_at: string
          enfant_id: string
          mariage_id: string
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          enfant_id: string
          mariage_id: string
        }
        Update: {
          created_at?: string
          enfant_id?: string
          mariage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'mariage_enfants_enfant_id_fkey'
            columns: ['enfant_id']
            isOneToOne: false
            referencedRelation: 'personnes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mariage_enfants_mariage_id_fkey'
            columns: ['mariage_id']
            isOneToOne: false
            referencedRelation: 'mariages'
            referencedColumns: ['id']
          },
        ]
      }
      mariages: {
        Row: {
          created_at: string
          date_fin: string | null
          date_mariage: string | null
          id: string
          personne_1_id: string
          personne_2_id: string
          type_fin: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          date_fin?: string | null
          date_mariage?: string | null
          id?: string
          personne_1_id: string
          personne_2_id: string
          type_fin?: string | null
        }
        Update: {
          created_at?: string
          date_fin?: string | null
          date_mariage?: string | null
          id?: string
          personne_1_id?: string
          personne_2_id?: string
          type_fin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'mariages_personne_1_id_fkey'
            columns: ['personne_1_id']
            isOneToOne: false
            referencedRelation: 'personnes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'mariages_personne_2_id_fkey'
            columns: ['personne_2_id']
            isOneToOne: false
            referencedRelation: 'personnes'
            referencedColumns: ['id']
          },
        ]
      }
      parent_enfants: {
        Row: {
          created_at: string
          enfant_id: string
          id: string
          parent_id: string
          type_parent: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          enfant_id: string
          id?: string
          parent_id: string
          type_parent?: string | null
        }
        Update: {
          created_at?: string
          enfant_id?: string
          id?: string
          parent_id?: string
          type_parent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'parent_enfants_enfant_id_fkey'
            columns: ['enfant_id']
            isOneToOne: false
            referencedRelation: 'personnes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'parent_enfants_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'personnes'
            referencedColumns: ['id']
          },
        ]
      }
      personnes: {
        Row: {
          appellation: string | null
          created_at: string
          date_deces: string | null
          date_naissance: string | null
          estLigneeGenerale: boolean
          id: string
          nom: string | null
          nom_facebook: string | null
          numero: string | null
          pays: string | null
          prenom: string | null
          profession: string | null
          quartier: string | null
          sexe: string | null
          updated_at: string
          urlImg: string | null
          urlImgThumb: string | null
          user_created: string | null
          user_edited: string | null
          ville: string | null
        }
        ComputedFields: never
        Insert: {
          appellation?: string | null
          created_at?: string
          date_deces?: string | null
          date_naissance?: string | null
          estLigneeGenerale?: boolean
          id?: string
          nom?: string | null
          nom_facebook?: string | null
          numero?: string | null
          pays?: string | null
          prenom?: string | null
          profession?: string | null
          quartier?: string | null
          sexe?: string | null
          updated_at?: string
          urlImg?: string | null
          urlImgThumb?: string | null
          user_created?: string | null
          user_edited?: string | null
          ville?: string | null
        }
        Update: {
          appellation?: string | null
          created_at?: string
          date_deces?: string | null
          date_naissance?: string | null
          estLigneeGenerale?: boolean
          id?: string
          nom?: string | null
          nom_facebook?: string | null
          numero?: string | null
          pays?: string | null
          prenom?: string | null
          profession?: string | null
          quartier?: string | null
          sexe?: string | null
          updated_at?: string
          urlImg?: string | null
          urlImgThumb?: string | null
          user_created?: string | null
          user_edited?: string | null
          ville?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          personne_id: string | null
          role: Database['public']['Enums']['user_role']
          updated_at: string
          user_created: string | null
          user_edited: string | null
        }
        ComputedFields: never
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          personne_id?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
          user_created?: string | null
          user_edited?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          personne_id?: string | null
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
          user_created?: string | null
          user_edited?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_personne_id_fkey'
            columns: ['personne_id']
            isOneToOne: false
            referencedRelation: 'personnes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _insert_personne: {
        Args: { p_est_lignee: boolean; p_new: Json }
        Returns: {
          appellation: string | null
          created_at: string
          date_deces: string | null
          date_naissance: string | null
          estLigneeGenerale: boolean
          id: string
          nom: string | null
          nom_facebook: string | null
          numero: string | null
          pays: string | null
          prenom: string | null
          profession: string | null
          quartier: string | null
          sexe: string | null
          updated_at: string
          urlImg: string | null
          urlImgThumb: string | null
          user_created: string | null
          user_edited: string | null
          ville: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'personnes'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_personne_par_mariage: {
        Args: { p_conjoint_id: string; p_new: Json }
        Returns: {
          appellation: string | null
          created_at: string
          date_deces: string | null
          date_naissance: string | null
          estLigneeGenerale: boolean
          id: string
          nom: string | null
          nom_facebook: string | null
          numero: string | null
          pays: string | null
          prenom: string | null
          profession: string | null
          quartier: string | null
          sexe: string | null
          updated_at: string
          urlImg: string | null
          urlImgThumb: string | null
          user_created: string | null
          user_edited: string | null
          ville: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'personnes'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_personne_par_naissance_mariage: {
        Args: { p_mariage_id: string; p_new: Json }
        Returns: {
          appellation: string | null
          created_at: string
          date_deces: string | null
          date_naissance: string | null
          estLigneeGenerale: boolean
          id: string
          nom: string | null
          nom_facebook: string | null
          numero: string | null
          pays: string | null
          prenom: string | null
          profession: string | null
          quartier: string | null
          sexe: string | null
          updated_at: string
          urlImg: string | null
          urlImgThumb: string | null
          user_created: string | null
          user_edited: string | null
          ville: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'personnes'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_personne_par_naissance_parent: {
        Args: { p_new: Json; p_parent_id: string }
        Returns: {
          appellation: string | null
          created_at: string
          date_deces: string | null
          date_naissance: string | null
          estLigneeGenerale: boolean
          id: string
          nom: string | null
          nom_facebook: string | null
          numero: string | null
          pays: string | null
          prenom: string | null
          profession: string | null
          quartier: string | null
          sexe: string | null
          updated_at: string
          urlImg: string | null
          urlImgThumb: string | null
          user_created: string | null
          user_edited: string | null
          ville: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'personnes'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_personne_root: {
        Args: { p_new: Json }
        Returns: {
          appellation: string | null
          created_at: string
          date_deces: string | null
          date_naissance: string | null
          estLigneeGenerale: boolean
          id: string
          nom: string | null
          nom_facebook: string | null
          numero: string | null
          pays: string | null
          prenom: string | null
          profession: string | null
          quartier: string | null
          sexe: string | null
          updated_at: string
          urlImg: string | null
          urlImgThumb: string | null
          user_created: string | null
          user_edited: string | null
          ville: string | null
        }
        SetofOptions: {
          from: '*'
          to: 'personnes'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_personne_id: { Args: Record<PropertyKey, never>; Returns: string }
      current_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_in_lignee: { Args: { target: string }; Returns: boolean }
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean }
      is_service_role: { Args: Record<PropertyKey, never>; Returns: boolean }
      set_user_role: {
        Args: {
          p_email: string
          p_personne_id?: string
          p_role: Database['public']['Enums']['user_role']
        }
        Returns: undefined
      }
    }
    Enums: {
      user_role: 'ROLE_ADMIN' | 'ROLE_MODERATEUR' | 'ROLE_USER'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      user_role: ['ROLE_ADMIN', 'ROLE_MODERATEUR', 'ROLE_USER'],
    },
  },
} as const
