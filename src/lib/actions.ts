'use server';

import { db } from './db';
import { revalidatePath } from 'next/cache';
import { Document, Category, Stats, ImpactDocument } from '@/types';

export async function getCategories() {
  try {
    const result = await db.execute('SELECT * FROM categorias');
    return result.rows.map(row => Object.assign({}, row)) as unknown as Category[];
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

export async function getDocuments(filters?: { tipo?: string, categoria_id?: number }) {
  try {
    let query = `
      SELECT d.*, c.nombre as categoria_nombre 
      FROM documentos d
      LEFT JOIN categorias c ON d.categoria_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.tipo) {
      query += ' AND d.tipo = ?';
      params.push(filters.tipo);
    }
    if (filters?.categoria_id) {
      query += ' AND d.categoria_id = ?';
      params.push(filters.categoria_id);
    }

    query += ' ORDER BY d.id DESC';

    const result = await db.execute({ sql: query, args: params });
    return result.rows.map(row => Object.assign({}, row)) as unknown as Document[];
  } catch (error) {
    console.error('Error fetching documents:', error);
    return [];
  }
}

export async function addDocument(formData: FormData) {
  try {
    const tipo = formData.get('tipo') as string;
    const categoriaIdValue = formData.get('categoria_id') as string;
    const categoria_id = (tipo === 'antecedente' || !categoriaIdValue) ? null : parseInt(categoriaIdValue);
    const region = formData.get('region') as string || 'N/A';
    const titulo = formData.get('titulo') as string;
    const revista_institucion = formData.get('revista_institucion') as string;
    const año = parseInt(formData.get('año') as string);
    const cuartil = formData.get('cuartil') as string || 'N/A';
    const lugar = formData.get('lugar') as string;
    const doi_link = formData.get('doi_link') as string;
    const link = formData.get('link') as string;
    const abstract = formData.get('abstract') as string;
    const pregunta_clave = formData.get('pregunta_clave') as string || '';
    const keywords_usadas = formData.get('keywords_usadas') as string;
    const autores = formData.get('autores') as string;
    const scimango = formData.get('scimango') as string;
    const base_datos = formData.get('base_datos') as string;

    await db.execute({
      sql: `INSERT INTO documentos (
        tipo, categoria_id, region, titulo, revista_institucion, 
        año, cuartil, lugar, doi_link, link, abstract, pregunta_clave, keywords_usadas, autores, scimango, base_datos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        tipo, categoria_id, region, titulo, revista_institucion,
        año, cuartil, lugar, doi_link, link, abstract, pregunta_clave, keywords_usadas, autores, scimango, base_datos
      ]
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error adding document:', error);
    if (error.message?.includes('UNIQUE constraint failed: documentos.doi_link')) {
      return { success: false, error: 'El DOI ya existe en la base de datos.' };
    }
    return { success: false, error: 'Error al guardar el documento.' };
  }
}

export async function updateDocument(formData: FormData) {
  try {
    const id = parseInt(formData.get('id') as string);
    const tipo = formData.get('tipo') as string;
    const categoriaIdValue = formData.get('categoria_id') as string;
    const categoria_id = (tipo === 'antecedente' || !categoriaIdValue) ? null : parseInt(categoriaIdValue);
    const region = formData.get('region') as string || 'N/A';
    const titulo = formData.get('titulo') as string;
    const revista_institucion = formData.get('revista_institucion') as string;
    const año = parseInt(formData.get('año') as string);
    const cuartil = formData.get('cuartil') as string || 'N/A';
    const lugar = formData.get('lugar') as string;
    const doi_link = formData.get('doi_link') as string;
    const link = formData.get('link') as string;
    const abstract = formData.get('abstract') as string;
    const pregunta_clave = formData.get('pregunta_clave') as string || '';
    const keywords_usadas = formData.get('keywords_usadas') as string;
    const autores = formData.get('autores') as string;
    const scimango = formData.get('scimango') as string;
    const base_datos = formData.get('base_datos') as string;

    await db.execute({
      sql: `UPDATE documentos SET
        tipo = ?, categoria_id = ?, region = ?, titulo = ?, revista_institucion = ?, 
        año = ?, cuartil = ?, lugar = ?, doi_link = ?, link = ?, abstract = ?, 
        pregunta_clave = ?, keywords_usadas = ?, autores = ?, scimango = ?, base_datos = ?
        WHERE id = ?`,
      args: [
        tipo, categoria_id, region, titulo, revista_institucion,
        año, cuartil, lugar, doi_link, link, abstract, pregunta_clave, 
        keywords_usadas, autores, scimango, base_datos, id
      ]
    });

    revalidatePath('/');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating document:', error);
    if (error.message?.includes('UNIQUE constraint failed: documentos.doi_link')) {
      return { success: false, error: 'El DOI ya existe en la base de datos.' };
    }
    return { success: false, error: 'Error al actualizar el documento.' };
  }
}

export async function getImpactDocuments(filters?: { categoria_id?: number, tipo?: string }) {
  try {
    let query = `
      SELECT d.*, c.nombre as categoria_nombre, 
             a.id as impact_id, a.problematica, a.aporte, a.herramientas, 
             a.dataset, a.metricas_resultados, a.analisis_critico, a.utilidad_proyecto
      FROM documentos d
      LEFT JOIN categorias c ON d.categoria_id = c.id
      LEFT JOIN analisis_impacto a ON d.id = a.documento_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.tipo) {
      query += ' AND d.tipo = ?';
      params.push(filters.tipo);
    }
    if (filters?.categoria_id) {
      query += ' AND d.categoria_id = ?';
      params.push(filters.categoria_id);
    }

    query += ' ORDER BY d.id DESC';

    const result = await db.execute({ sql: query, args: params });
    return result.rows.map(row => Object.assign({}, row)) as unknown as ImpactDocument[];
  } catch (error) {
    console.error('Error fetching impact documents:', error);
    return [];
  }
}

export async function saveImpactAnalysis(formData: FormData) {
  try {
    const documento_id = parseInt(formData.get('documento_id') as string);
    const problematica = formData.get('problematica') as string || '';
    const aporte = formData.get('aporte') as string || '';
    const herramientas = formData.get('herramientas') as string || '';
    const dataset = formData.get('dataset') as string || '';
    const metricas_resultados = formData.get('metricas_resultados') as string || '';
    const analisis_critico = formData.get('analisis_critico') as string || '';
    const utilidad_proyecto = formData.get('utilidad_proyecto') as string || '';

    await db.execute({
      sql: `
        INSERT INTO analisis_impacto (
          documento_id, problematica, aporte, herramientas, dataset, 
          metricas_resultados, analisis_critico, utilidad_proyecto
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(documento_id) DO UPDATE SET
          problematica=excluded.problematica,
          aporte=excluded.aporte,
          herramientas=excluded.herramientas,
          dataset=excluded.dataset,
          metricas_resultados=excluded.metricas_resultados,
          analisis_critico=excluded.analisis_critico,
          utilidad_proyecto=excluded.utilidad_proyecto
      `,
      args: [
        documento_id, problematica, aporte, herramientas, dataset, 
        metricas_resultados, analisis_critico, utilidad_proyecto
      ]
    });
    
    revalidatePath('/impacto');
    return { success: true };
  } catch (error) {
    console.error('Error saving impact analysis:', error);
    return { success: false, error: 'Error al guardar el análisis de impacto.' };
  }
}

export async function getStats(): Promise<Stats> {
  try {
    const totalResult = await db.execute('SELECT COUNT(*) as count FROM documentos');
    const antResult = await db.execute("SELECT COUNT(*) as count FROM documentos WHERE tipo = 'antecedente'");
    const artResult = await db.execute("SELECT COUNT(*) as count FROM documentos WHERE tipo = 'articulo'");
    
    const catResult = await db.execute(`
      SELECT c.id as categoria_id, c.nombre as categoria_nombre, COUNT(d.id) as count 
      FROM categorias c
      LEFT JOIN documentos d ON c.id = d.categoria_id AND d.tipo = 'articulo'
      GROUP BY c.id
    `);

    return {
      totalDocs: Number(totalResult.rows[0].count),
      totalAntecedentes: Number(antResult.rows[0].count),
      totalArticulos: Number(artResult.rows[0].count),
      antecedentesGoal: 10,
      articulosGoal: 40,
      byCategory: catResult.rows.map((row: any) => ({
        categoria_id: Number(row.categoria_id),
        categoria_nombre: row.categoria_nombre,
        count: Number(row.count),
        goal: 8 // 8 per category as requested (5 categories * 8 = 40)
      }))
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      totalDocs: 0,
      totalAntecedentes: 0,
      totalArticulos: 0,
      antecedentesGoal: 10,
      articulosGoal: 40,
      byCategory: []
    };
  }
}

export async function initDatabase() {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS categorias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL UNIQUE
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS documentos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT CHECK(tipo IN ('antecedente', 'articulo')) NOT NULL,
        categoria_id INTEGER,
        region TEXT CHECK(region IN ('Nacional', 'Internacional', 'N/A')) DEFAULT 'N/A',
        titulo TEXT NOT NULL,
        revista_institucion TEXT,
        año INTEGER,
        cuartil TEXT CHECK(cuartil IN ('Q1', 'Q2', 'Q3', 'Q4', 'N/A')),
        lugar TEXT,
        doi_link TEXT UNIQUE,
        link TEXT,
        abstract TEXT,
        pregunta_clave TEXT,
        keywords_usadas TEXT,
        autores TEXT,
        scimango TEXT,
        base_datos TEXT,
        FOREIGN KEY (categoria_id) REFERENCES categorias(id)
      )
    `);

    try {
      await db.execute('ALTER TABLE documentos ADD COLUMN scimango TEXT');
    } catch {
      // Column might already exist
    }

    try {
      await db.execute('ALTER TABLE documentos ADD COLUMN base_datos TEXT');
    } catch {
      // Column might already exist
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS analisis_impacto (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        documento_id INTEGER UNIQUE,
        problematica TEXT,
        aporte TEXT,
        herramientas TEXT,
        dataset TEXT,
        metricas_resultados TEXT,
        analisis_critico TEXT,
        utilidad_proyecto TEXT,
        FOREIGN KEY (documento_id) REFERENCES documentos(id) ON DELETE CASCADE
      )
    `);

    // Add default categories if empty, or enforce the new category names
    const newCategories = [
      { id: 1, nombre: 'Categoría 1: Arquitecturas de Sistemas Multi-Agente (MAS) en Diagnóstico' },
      { id: 2, nombre: 'Categoría 2: Modelos de Lenguaje (LLMs) y RAG Avanzado en Mantenimiento' },
      { id: 3, nombre: 'Categoría 3: Procesamiento Multimodal en Entornos Industriales' },
      { id: 4, nombre: 'Categoría 4: Interacción Humano-Computadora (HCI) para Técnicos de Campo' },
      { id: 5, nombre: 'Categoría 5: Diagnóstico Predictivo y Reactivo en Transporte Vertical' }
    ];

    const cats = await db.execute('SELECT COUNT(*) as count FROM categorias');
    if (Number(cats.rows[0].count) === 0) {
      for (const cat of newCategories) {
        await db.execute({
          sql: 'INSERT INTO categorias (id, nombre) VALUES (?, ?)',
          args: [cat.id, cat.nombre]
        });
      }
    } else {
      for (const cat of newCategories) {
        await db.execute({
          sql: 'UPDATE categorias SET nombre = ? WHERE id = ?',
          args: [cat.nombre, cat.id]
        });
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  }
}
