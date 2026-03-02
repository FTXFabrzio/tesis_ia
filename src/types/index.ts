export type DocumentType = 'antecedente' | 'articulo';
export type Region = 'Nacional' | 'Internacional' | 'N/A';
export type Cuartil = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'N/A';

export interface Category {
  id: number;
  nombre: string;
}

export interface Document {
  id: number;
  tipo: DocumentType;
  categoria_id: number;
  categoria_nombre?: string;
  region: Region;
  titulo: string;
  revista_institucion: string;
  año: number;
  cuartil: Cuartil;
  lugar: string;
  doi_link: string;
  link?: string;
  abstract: string;
  pregunta_clave: string;
  keywords_usadas?: string;
  autores?: string;
  scimango?: string;
  base_datos?: string;
}

export interface ImpactAnalysis {
  id?: number;
  documento_id: number;
  problematica?: string;
  aporte?: string;
  herramientas?: string;
  dataset?: string;
  metricas_resultados?: string;
  analisis_critico?: string;
  utilidad_proyecto?: string;
}

export interface ImpactDocument extends Document {
  impact_id?: number;
  problematica?: string;
  aporte?: string;
  herramientas?: string;
  dataset?: string;
  metricas_resultados?: string;
  analisis_critico?: string;
  utilidad_proyecto?: string;
}

export interface Stats {
  totalDocs: number;
  totalAntecedentes: number;
  totalArticulos: number;
  antecedentesGoal: number;
  articulosGoal: number;
  byCategory: {
    categoria_id: number;
    categoria_nombre: string;
    count: number;
    goal: number;
  }[];
}
