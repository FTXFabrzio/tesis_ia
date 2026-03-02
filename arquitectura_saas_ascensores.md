# 🏗️ Documento de Especificaciones de Arquitectura y Producto
## SaaS · Sistema Multi-Agente para Mantenimiento de Ascensores

> **Versión:** 1.0 · **Fecha:** 2026-02-26  
> **Stack:** NestJS (Backend / Agentes) · Angular + PWA (Frontend) · Supabase (DB) · LangChain / LangGraph (Orquestación)  
> **Modalidades soportadas:** Texto · Audio · Imagen · Video  
> **Fuente:** Análisis de 50 papers científicos (`analisis_impacto.json`)

---

# MÓDULO 1 — Core Backend & Orquestación (NestJS)

---

## ⚙️ 1.1 Agente Orquestador con Enrutamiento Inteligente por Grafos

**Descripción Técnica:**  
El Orquestador es el componente central del backend NestJS. Recibe todos los mensajes del chat (texto, transcripciones de audio, metadatos de imagen/video) y decide qué agentes especialistas activar, en qué orden y si en paralelo o en secuencia. La decisión de despacho se modela como un **grafo de dependencia de tareas** (DAG), donde cada nodo es un agente especialista y las aristas representan dependencias de datos. El Orquestador usa un mecanismo de **atención algorítmica** para extraer los síntomas críticos de mensajes largos o ambiguos antes de enrutar.

**Justificación Científica:**  
- Enrutamiento por GNN + PPO: *doc_id 18* (GNN para task-embedding + RL con recompensas intrínsecas para despacho en tiempo real).  
- Mecanismo de atención para filtrar "ruido" textual: *doc_id 26* (LSTM + Attention para señales industriales).  
- Jerarquía Orquestador → Agentes: *doc_id 32* (IA agéntica como "arquitecto" que orquesta "ladrillos").  
- Negociación de hipótesis entre agentes: *doc_id 35* (Teoría Coevolutiva con LLM como árbitro).  

**Requerimientos de Implementación:**
- Crear `OrchestratorModule` en NestJS con un servicio `OrchestratorService`.
- Implementar un `TaskGraph` (objeto JSON de nodos + aristas) que mapee síntomas detectados → agentes a invocar.
- Desarrollar `AttentionFilterService`: recibe el texto del usuario, usa un prompt estructurado al LLM para extraer únicamente los síntomas técnicos (elimina saludos, ruido, contexto irrelevante) antes de enrutar.
- Exponer `POST /api/chat/message` como endpoint principal del chat. Este endpoint es la única entrada al sistema desde el frontend.
- El Orquestador debe invocar agentes especialistas de forma **asíncrona** (`Promise.all` para agentes paralelos) y **secuencial** solo cuando exista dependencia de datos entre ellos.
- Implementar timeout de 15 s por agente. Si un agente supera el timeout, el Orquestador usa la respuesta del resto y marca el agente como degradado.

---

## ⚙️ 1.2 Tolerancia a Fallos y Auto-Curación del Backend (Self-Healing)

**Descripción Técnica:**  
Cuando un agente especialista falla (timeout de API, error 5xx del LLM, pérdida de conexión a la base de datos), el sistema no regresa un error al técnico. En su lugar, el Orquestador aplica un protocolo de **recuperación automática en cascada**: primero reintenta la llamada de forma atómica, luego deriva la consulta a un agente de respaldo y, como último recurso, degrada el servicio (responde solo con los agentes disponibles, explicitando la limitación al usuario).

**Justificación Científica:**  
- Modelo KAR de reintentos atómicos (happen-before): *doc_id 13* (Kafka + Redis para estado del actor, reintentos sin deadlocks).  
- Self-Healing por capas con recursos de respaldo: *doc_id 27* (Docker, Kafka, autocuración en clouds híbridas).  
- MAS descentralizado con restauración de energía autónoma: *doc_id 30* (MAS metro con IEC 61850).  
- Reconfiguración modular dinámica: *doc_id 29* (primitivas de control modulares IEC 61131-3).  

**Requerimientos de Implementación:**
- Implementar `RetryInterceptor` global en NestJS usando `nestjs-retry` o lógica custom con backoff exponencial (1 s, 2 s, 4 s; máximo 3 intentos).
- Crear `AgentHealthRegistry`: un mapa en Redis que almacena el estado de cada agente (`healthy | degraded | down`) actualizado cada 30 s mediante health checks.
- Cuando `AgentHealthRegistry` marque un agente como `down`, el `OrchestratorService` lo sustituye automáticamente por el agente de respaldo definido en la tabla `agent_fallbacks` de la DB.
- Persistir todos los mensajes (request + response) en la tabla `chat_messages` de Supabase **antes** de llamar a los agentes, garantizando que si el servidor muere el historial no se pierda.
- Implementar un endpoint `GET /api/health/agents` que exponga el estado del `AgentHealthRegistry` para monitoreo interno.

---

## ⚙️ 1.3 Model Context Protocol (MCP) — Contexto Auditado por Sesión

**Descripción Técnica:**  
Cada sesión de chat está vinculada a un ascensor específico (identificado por su ID en la DB). Al iniciar la conversación, el frontend envía el `elevator_id`. El backend, mediante el **Model Context Protocol (MCP)**, inyecta automáticamente el contexto completo del ascensor (marca, modelo, historial de tickets anteriores, alertas activas) en el primer prompt del Orquestador. Esto garantiza que cada respuesta del MAS esté acotada al equipo correcto, sea auditable y no mezcle datos entre ascensores.

**Justificación Científica:**  
- MCP para estandarizar comunicación frontend ↔ MAS: *doc_id 36* (arquitectura MCP para sensores, LLMs y técnicos).  
- Grafo de eventos del ascensor para trazabilidad: *doc_id 9* (framework To-FD-EKG con gemelo digital).  
- Diagnóstico auditable con rutas de razonamiento visibles: *doc_id 9* (reducción de alucinaciones con rutas observables).  

**Requerimientos de Implementación:**
- Crear `ContextBuilderService` que, dado un `elevator_id`, consulta Supabase y construye el objeto `McpContext`:
  ```typescript
  interface McpContext {
    elevator: { id, brand, model, serial, location };
    lastTickets: Ticket[]; // últimos 10 tickets
    activeAlerts: Alert[];
    technician: { id, name, experienceLevel };
  }
  ```
- Inyectar `McpContext` como **system prompt** en cada llamada al LLM Orquestador.
- Almacenar en `chat_sessions` el `McpContext` serializado para auditoría posterior.
- Crear tabla `agent_reasoning_logs` en Supabase: guarda el razonamiento intermedio de cada agente por sesión (qué agentes se invocaron, qué encontraron, cómo se llegó a la respuesta final).

---

## ⚙️ 1.4 Orquestación Asíncrona con Offloading de Tareas Pesadas

**Descripción Técnica:**  
Cuando el técnico sube un archivo pesado (video de 30 s, audio de 2 min), el procesamiento **no bloquea** el hilo principal del chat. El backend NestJS publica la tarea de procesamiento en una **cola de trabajo** (BullMQ + Redis). El frontend recibe inmediatamente un mensaje de acuse de recibo ("Analizando tu archivo…") mientras los workers procesan en background. Al terminar, el resultado se empuja al chat vía **WebSocket**.

**Justificación Científica:**  
- Offloading asíncrono para no congelar la UI: *doc_id 12* (RL Offline AOTO para manejar tareas asíncronas sin saturar el sistema).  
- Despacho de workflows complejos en tiempo real: *doc_id 18* (GNN + PPO para microservicios IoT).  

**Requerimientos de Implementación:**
- Instalar `@nestjs/bull` + `bullmq` + Redis en el backend.
- Crear `MediaProcessingQueue` con jobs: `process-audio`, `process-video`, `process-image`.
- Implementar `MediaProcessingWorker` que consuma la cola, ejecute el pipeline multimodal y emita el resultado via `ChatGateway` (WebSocket con `@nestjs/websockets`).
- El frontend Angular se suscribe al WebSocket y actualiza el hilo del chat cuando llega el resultado sin recargar la página.
- Definir `MAX_VIDEO_DURATION_SECONDS = 60` y `MAX_FILE_SIZE_MB = 50` en la configuración del validador de uploads.

---

## ⚙️ 1.5 Lógica BPMN para Flujos de Diagnóstico Auditables

**Descripción Técnica:**  
El flujo de preguntas de diagnóstico que hace el Orquestador al técnico sigue un **árbol de decisiones modelado en BPMN**. Esto evita que la IA improvise preguntas aleatorias y garantiza que la entrevista de diagnóstico sea estructurada, reproducible y auditable. Cada "gate" del BPMN corresponde a una pregunta de seguimiento específica. El estado del flujo se persiste en Redis para que si el técnico cierra la app y regresa, la conversación continúa desde donde la dejó.

**Justificación Científica:**  
- BPMN + MAS para flujos auditables sin alucinaciones: *doc_id 33* (BPMN + LangGraph + RAG con fidelidad 0.82).  
- Reducción de carga cognitiva en el técnico: *doc_id 46* (modelo GOMS/KLM para minimizar interacciones).  

**Requerimientos de Implementación:**
- Modelar en `diagnosisFlows.json` los flujos BPMN para los 3 dominios principales: `door-fault`, `motor-fault`, `electronic-fault`.
- Cada nodo del flujo define: `question` (texto al técnico), `expectedInputType` (text | image | audio | boolean), `nextNodeMap` (mapa condición → nodo siguiente).
- `OrchestratorService` carga el flujo activo y avanza el nodo según la respuesta del técnico.
- Persistir el `currentNodeId` del flujo en Redis con TTL de 24 h, indexado por `session_id`.
- Los flujos deben ser editables sin redeploy, almacenados en la tabla `diagnosis_flows` de Supabase.

---

# MÓDULO 2 — Motores de IA y Bases de Conocimiento

---

## ⚙️ 2.1 GraphRAG — Base de Conocimiento de Manuales con Grafos

**Descripción Técnica:**  
Los manuales técnicos de los fabricantes de ascensores (PDFs) se procesan, se convierten en entidades (componentes, fallas, procedimientos, códigos de error) y se almacenan en un **Grafo de Conocimiento (KG)**. Las consultas al KG se realizan mediante **GraphRAG**, que combina búsqueda vectorial semántica con traversal de relaciones del grafo. Esto permite responder preguntas complejas como: "¿Qué piezas se relacionan con el código de error E7 del ascensor Otis Gen2?" sin alucinaciones.

**Justificación Científica:**  
- GraphRAG + LLM para manuales industriales: *doc_id 14* (plataforma minera con StarRocks + Flink + GraphRAG).  
- GraphRAG + CoT para generar documentos técnicos estructurados: *doc_id 19* (MGDs en Baosteel).  
- KG embeddings en LLM via prefix-tuning: *doc_id 37* (AAKG con 98.5% de precisión diagnóstica).  

**Requerimientos de Implementación:**
- Pipeline de ingesta de documentos: `PDF → chunking → embedding (OpenAI text-embedding-3-small) → almacenamiento en pgvector (Supabase)`.
- Construir el KG en Neo4j (o ArangoDB): nodos `Component`, `FaultCode`, `Procedure`, `Part`; relaciones `CAUSES`, `REQUIRES`, `SOLVES`, `PART_OF`.
- Crear `KnowledgeGraphService` en NestJS que expone `query(symptom: string): GraphNode[]` usando Cypher queries.
- Implementar `GraphRAGService` que primero hace búsqueda vectorial (top-5 chunks) y luego expande los resultados con traversal de 2 saltos en el grafo.
- Aplicar **Prefix-tuning** al LLM del Agente Bibliotecario con los embeddings del KG para respuestas con <3% de parámetros adicionales.
- Endpoint: `POST /api/knowledge/query` para consultas directas al KG desde el Agente Orquestador.

---

## ⚙️ 2.2 Diagnóstico One-Shot / Few-Shot con LLM como Clasificador

**Descripción Técnica:**  
Cuando aparece una falla nueva o poco común (sin historial), el sistema no falla: usa el "sentido común técnico" del LLM combinado con **codificación aritmética** para calcular la distancia semántica entre la descripción de la falla nueva y las fallas conocidas en el KG. Esto permite diagnosticar con 1 a 5 ejemplos de referencia.

**Justificación Científica:**  
- One-shot diagnosis con LLM + distancia de Kolmogorov: *doc_id 9* (100% de precisión en 1-5 ejemplos).  
- Fábrica de modelos pequeños supervisada por LLM: *doc_id 10* (BC-MF con GVFL).  

**Requerimientos de Implementación:**
- Implementar `FewShotDiagnosisService` que dado un síntoma nuevo: (1) busca los 3 casos más similares en el KG, (2) construye un prompt few-shot con esos ejemplos, (3) invoca al LLM para clasificar.
- Almacenar cada diagnóstico confirmado por el técnico en `confirmed_diagnoses` (Supabase) para enriquecer el pool de ejemplos.
- Si `confirmed_diagnoses.count` para un tipo de falla < 5, activar automáticamente el modo few-shot; si ≥ 5, usar el modelo fine-tuneado específico.

---

## ⚙️ 2.3 Transfer Learning y Adaptación de Dominio entre Flotas

**Descripción Técnica:**  
Si el sistema aprende a diagnosticar fallas de tracción en un modelo de ascensor Otis, puede **transferir ese conocimiento** para analizar un ascensor Schindler de gama similar sin reentrenar desde cero. Se usa un modelo Transformer pre-entrenado con fine-tuning de bajo rango (LoRA) que ajusta solo los parámetros relevantes al nuevo dominio (nueva marca/modelo).

**Justificación Científica:**  
- Transfer Learning Transformer para diagnóstico cross-domain: *doc_id 42* (alta precisión con pocos datos específicos).  
- CNN Transfer Learning para variaciones de velocidad/dominio: *doc_id 45* (robustez ante "cambio de dominio").  
- DiagLLM con LoRA fine-tuning: *doc_id 40* (>SOTA en generalización cruzada).  

**Requerimientos de Implementación:**
- Usar arquitectura base `microsoft/phi-2` o `mistralai/Mistral-7B` con LoRA adapters por marca de ascensor.
- Crear `ModelAdapterRegistry`: tabla en Supabase que mapea `brand_id → lora_adapter_path`.
- Al iniciar sesión de chat, `ContextBuilderService` carga el LoRA adapter correspondiente a la marca del ascensor.
- Pipeline de fine-tuning: cuando se acumulan ≥50 casos confirmados para una nueva marca, disparar automáticamente un job de fine-tuning en GPU (AWS SageMaker o Modal.com).

---

## ⚙️ 2.4 Generación de Datos Sintéticos para Arranque en Frío

**Descripción Técnica:**  
Al lanzar el SaaS sin historial de fallas real, los agentes se pre-entrenan con un **dataset sintético** generado a partir de los manuales de los fabricantes. El LLM genera descripciones realistas de fallas, sonidos y síntomas que nunca ocurrieron pero que son técnicamente válidos según los manuales. Esto garantiza que el sistema funcione desde el primer día.

**Justificación Científica:**  
- Datos sintéticos para PdM sin historial: *doc_id 25* (IntelliPdM, reducción 70-75% de averías).  
- Líneas base sintéticas para motores sin datos históricos: *doc_id 44* (motores Clase I <15 kW).  
- GPT-4 para generación de datos de falla y estandarización: *doc_id 39* (240,000 registros del foro Siemens).  

**Requerimientos de Implementación:**
- Crear `SyntheticDataGeneratorService` en NestJS que usa GPT-4 con el siguiente prompt base: `"Eres un técnico de ascensores experto. Genera 10 descripciones realistas de la falla [fault_type] en un ascensor [brand] [model]. Incluye síntomas acústicos, visuales y códigos de error."`.
- Almacenar los datos sintéticos en tabla `synthetic_training_cases` con columna `is_synthetic = true`.
- Validar los datos sintéticos manualmente antes de pasarlos al pipeline de entrenamiento (revisión humana en el loop).
- Meta: generar ≥500 casos sintéticos por tipo de falla antes del lanzamiento.

---

## ⚙️ 2.5 Ontología Dinámica — Vinculación de Jerga Técnica Local

**Descripción Técnica:**  
Los técnicos usan jerga local ("se quemó el cerebro de la puerta"). El sistema usa **RAG + LLM** para vincular automáticamente ese término coloquial con la entidad formal del KG ("falla en la placa PCB del operador de puertas"). La ontología se actualiza dinámicamente con cada nueva expresión confirmada, sin intervención del desarrollador.

**Justificación Científica:**  
- DRAGON-AI para ontologías automáticas con LLM + RAG: *doc_id 21* (alta precisión en relaciones jerárquicas).  
- assInNNER para extracción de entidades anidadas con pocos datos: *doc_id 38* (F1+8.25% con 5-25% de datos).  

**Requerimientos de Implementación:**
- Crear tabla `jargon_mappings`: `{ colloquial_term, formal_entity_id, confirmed_by_technician_id, created_at }`.
- `OntologyService`: antes de procesar cualquier mensaje, busca términos del texto en `jargon_mappings`; si hay match, reemplaza el término coloquial por la entidad formal.
- Si no hay match, el LLM intenta mapear el término con un prompt de NER + ontología; si la confianza > 0.8, propone el mapeo al técnico para confirmación.
- Interface de administración en el dashboard web para revisar y aprobar nuevos mappings propuestos.

---

## ⚙️ 2.6 Predicción Probabilística de Fallas (sin Absolutos)

**Descripción Técnica:**  
El sistema no devuelve diagnósticos binarios ("es el variador de frecuencia"). Devuelve una **distribución de probabilidades** sobre las posibles causas. Esto guía al técnico sin imponer una verdad absoluta, eliminando el riesgo de que el técnico tome una decisión equivocada basada en una alucinación de la IA.

**Justificación Científica:**  
- Deep Learning Bayesiano para distribuciones de RUL: *doc_id 15* (BiLSTM + FNN con Monte Carlo dropout, AC 70%).  
- LSTM + KNN para cruzar teoría y práctica histórica: *doc_id 20* (bucle cerrado en taller automotriz).  

**Requerimientos de Implementación:**
- El `DiagnosisAgentService` devuelve: `{ hypotheses: [{ cause, probability, evidence }] }`.
- El frontend renderiza las hipótesis como una lista ordenada por probabilidad con badges de porcentaje.
- Si la hipótesis top tiene probabilidad < 60%, el sistema pide al técnico más información antes de emitir una recomendación de reparación.
- Almacenar las distribuciones en `diagnosis_probability_logs` para análisis retrospectivo de la calibración del modelo.

---

# MÓDULO 3 — Procesamiento Multimodal y Archivos

---

## ⚙️ 3.1 Pipeline de Fusión Audio-Video-Texto en el Servidor

**Descripción Técnica:**  
Cuando el técnico sube simultáneamente (o en secuencia dentro de la misma sesión) un clip de video, una nota de voz y una descripción de texto, el backend **funde las tres modalidades** en un único tensor de características antes de enviárselo a los agentes especialistas. Esto es cualitativamente superior a analizar cada modalidad por separado.

**Justificación Científica:**  
- Fusión Audio-Vision-Language con ACPs: *doc_id 49* (red de flujo dual, resultados grano fino en diagnóstico).  
- Fusión multimodal para reducir diagnóstico de campo: *doc_id 39* (GPT-4 + Laama2 + LangChain para unificar señales).  
- Alineación multimodal vibración + texto con atención cruzada: *doc_id 11* (T2MFDF: ACC 93.256%, F1 0.934).  

**Requerimientos de Implementación:**
- Crear `MultimodalFusionService` en NestJS que recibe `{ audioPath, videoPath, textDescription }` y construye el prompt multimodal.
- Pipeline de audio: `audio → Whisper STT → transcripción` + `audio → espectrograma (librosa) → imagen PNG`.
- Pipeline de video: `video → extracción de frames clave (FFmpeg, 1 frame/5s) → array de imágenes`.
- Pipeline de texto: normalización + extracción de entidades con `OntologyService`.
- Combinar los resultados en un prompt estructurado: `[TRANSCRIPCIÓN]: ... [ESPECTROGRAMA]: {base64} [FRAMES]: {base64[]} [DESCRIPCIÓN]: ...`.
- Enviar el prompt combinado al LLM visión (GPT-4o o Gemini 1.5 Pro).

---

## ⚙️ 3.2 Análisis de Espectrogramas para Diagnóstico Acústico

**Descripción Técnica:**  
Las notas de voz del técnico grabando el ruido anormal de las poleas son convertidas en **espectrogramas 2D** en el servidor. Un agente basado en **Vision Transformer (ViT)** analiza la imagen del espectrograma para detectar la "firma acústica" de la falla, filtrando el ruido de fondo del pasillo. No se requiere ningún micrófono instalado en el edificio.

**Justificación Científica:**  
- SA-DCNN + ViT para diagnóstico acústico con ruido: *doc_id 43* (>95% de precisión con interferencia alta).  
- Transformada de Hilbert Huang para señales de vibración en motores: *doc_id 3* (detección de fallas incipientes).  
- DiagLLM con espectrogramas de envolvente: *doc_id 40* (LoRA + ViT, explicabilidad física).  

**Requerimientos de Implementación:**
- Instalar `librosa` en el microservicio Python de procesamiento de audio (llamado desde NestJS via HTTP interno).
- Generar espectrograma Mel: `librosa.feature.melspectrogram(y, sr, n_mels=128)` y exportar como PNG.
- Servir el PNG al modelo ViT fine-tuneado (base: `google/vit-base-patch16-224`).
- El output del ViT es un vector de logits por clase de falla: `['door-belt-wear', 'motor-bearing', 'brake-friction', 'normal']`.
- Almacenar el espectrograma PNG en Supabase Storage, vinculado al `chat_message_id` para auditoría.

---

## ⚙️ 3.3 OCR de Códigos de Error y Lectura de Tableros de Control

**Descripción Técnica:**  
El técnico puede fotografiar el display LCD o los LEDs del tablero de control del ascensor y subirla al chat. El backend aplica **OCR especializado** para extraer los códigos de error visibles en la imagen, los normaliza y los consulta automáticamente en el KG de manuales para obtener la causa y la solución.

**Justificación Científica:**  
- Framework de clasificación de estados del tablero de control de puertas: *doc_id 47* (clasificación alta precisión sin conexión al hardware).  
- OCR con ChatGPT Vision para textos técnicos: *doc_id 33* (libros escaneados del INL con alta fidelidad).  
- KG embeddings para consulta de códigos de error: *doc_id 37* (AAKG prefix-tuning, 98.5% de precisión).  

**Requerimientos de Implementación:**
- Endpoint: `POST /api/media/ocr` recibe imagen base64, invoca GPT-4o Vision con prompt: `"Extrae todos los códigos de error, números y textos técnicos visibles en esta imagen de tablero de control de ascensor. Devuelve un JSON array."`.
- Mapear cada código extraído a la tabla `error_codes` del KG: `SELECT * FROM error_codes WHERE code = $1 AND brand_id = $2`.
- Si el código no existe en la DB, el sistema lo busca en el grafo de conocimiento por similitud semántica.
- El resultado se inyecta automáticamente en el hilo del chat como una tarjeta estructurada: `{ code, description, probable_cause, recommended_action }`.

---

## ⚙️ 3.4 Fusión de Imágenes Multimodales (Térmica + Visual)

**Descripción Técnica:**  
Si el técnico tiene un accesorio de cámara térmica para el smartphone (FLIR ONE), puede subir tanto la foto normal como la termografía. El backend fusiona ambas imágenes mediante un algoritmo de **fusión cross-modal** (MLP residual + convoluciones separables) para mejorar la detección de sobrecalentamiento en frenos y placas de control, produciendo una imagen combinada con mayor detalle.

**Justificación Científica:**  
- CMFuse para fusión de imágenes térmicas y visibles: *doc_id 41* (superior en contraste y preservación de bordes).  
- CNN + 2D-DWT + HSI para detección termográfica de desalineamiento: *doc_id 5* (>90% de precisión desde múltiples ángulos).  

**Requerimientos de Implementación:**
- Microservicio Python con `torch` que implementa CMFuse (MLP residual + depthwise separable convolutions).
- Endpoint: `POST /api/media/fuse-thermal` recibe `{ thermalImageBase64, visibleImageBase64 }`.
- Output: imagen fusionada PNG + mapa de calor de regiones de alta temperatura con bounding boxes.
- Umbral de alerta: si temperatura máxima detectada > 80°C en una región, marcar automáticamente como `CRITICAL` en el análisis.

---

# MÓDULO 4 — Frontend y Experiencia de Usuario (Angular / PWA)

---

## ⚙️ 4.1 Pre-procesamiento Local con TinyML en el Navegador

**Descripción Técnica:**  
El smartphone del técnico es el "borde" (edge). Antes de subir cualquier archivo al backend, la PWA ejecuta **modelos ligeros TinyML** en el navegador (via TensorFlow.js) para: (1) detectar si el audio contiene realmente un ruido mecánico anormal o es silencio/ruido ambiental puro, y (2) comprimir/redimensionar imágenes y extraer frames clave del video. Esto reduce drásticamente el consumo de datos y la latencia percibida.

**Justificación Científica:**  
- TinyML en dispositivos de bajo consumo: *doc_id 48* (300 ms latencia, 96.5% precisión en edge).  
- Modelos podados para MCUs (TensorFlow Lite): *doc_id 27* (pérdida <3% de precisión).  
- Modelos ligeros en el frontend para ahorro de ancho de banda: *doc_id 27* (aplicado al contexto de foso de ascensor con mala señal).  

**Requerimientos de Implementación:**
- Integrar `@tensorflow/tfjs` en la PWA Angular.
- Cargar modelo de detección de anomalías acústicas (`anomaly_detector.tflite` convertido a `tfjs`) al iniciar la app (cacheado en Service Worker).
- Pipeline local: `microfono → AudioContext API → buffer de 2s → modelo TinyML → { isAnomalous: boolean, confidence: number }`.
- Solo subir el audio al backend si `isAnomalous = true && confidence > 0.7`. De lo contrario, informar al técnico: "No detecto anomalías en este clip. ¿Deseas enviarlo de todas formas?".
- Para imágenes: redimensionar a máx. 1024×1024 px con `OffscreenCanvas` antes del upload.
- Para video: extraer frames clave con `VideoDecoder API` y subir solo los frames (no el video completo) si el tamaño > 10 MB.

---

## ⚙️ 4.2 Interfaz Conversacional con Reducción de Carga Cognitiva

**Descripción Técnica:**  
El chat no es un chat genérico. Está diseñado con los principios del modelo **GOMS/KLM** para el trabajo técnico: mensajes cortos, preguntas de una sola cosa a la vez, confirmaciones binarias (Sí/No en vez de texto libre cuando es posible), y escala de experiencia del usuario. Los técnicos junior reciben instrucciones más detalladas y paso a paso; los expertos reciben respuestas compactas con terminología técnica directa.

**Justificación Científica:**  
- Modelo GOMS/KLM para reducir puntos de fricción en diagnóstico: *doc_id 46* (tiempo de diagnóstico e interacciones minimizadas).  
- Diseño centrado en el humano con feedback inmediato y adaptabilidad: *doc_id 50* (Industria 4.0/5.0, interfaces Hci).  
- Guía visual in-situ simulada desde la pantalla del móvil: *doc_id 23* (sustituto de AR con instrucciones visuales).  

**Requerimientos de Implementación:**
- Columna `experience_level` en tabla `technicians`: `['junior', 'senior', 'expert']`.
- `ContextBuilderService` incluye `experience_level` en `McpContext`. El LLM ajusta el nivel de detalle del prompt según ese valor.
- Componente Angular `<app-quick-reply-buttons>`: renderiza botones de respuesta rápida (Sí/No, Reintentar, Ver manual) en lugar de esperar texto libre cuando el flujo BPMN lo permite.
- Componente `<app-step-guide>`: renderiza instrucciones numeradas tipo wizard con checkboxes para que el técnico confirme cada acción ejecutada.
- Componente `<app-media-reference>`: muestra imágenes/diagramas del manual extraídos del KG directamente en el hilo del chat cuando el diagnóstico es complejo.

---

## ⚙️ 4.3 Compresión y Optimización de Datos para Conectividad Baja

**Descripción Técnica:**  
El técnico trabaja dentro del foso del ascensor con señal de internet débil o intermitente. La PWA implementa estrategias de **compresión agresiva** y **almacenamiento offline-first** con sincronización automática cuando vuelve la conectividad.

**Justificación Científica:**  
- Edge computing en el celular para ahorro de datos y latencia: *doc_id 27* (poda de modelos para MCUs, aplicado al móvil).  
- Gestión de picos de tráfico y usuarios asíncronos: *doc_id 12* (AOTO para colas en tiempo real).  

**Requerimientos de Implementación:**
- Implementar Service Worker con Workbox: estrategia `NetworkFirst` para el chat, `CacheFirst` para los assets de manuales del KG.
- IndexedDB para cola de mensajes offline: si no hay red, los mensajes del técnico se encolan localmente y se envían automáticamente al reconectar.
- Audio: comprimir grabaciones a Opus 32kbps antes del upload (usar `MediaRecorder` API con `mimeType: 'audio/ogg; codecs=opus'`).
- Video: límite de 60 s; el frontend muestra advertencia si el clip supera 20 MB y ofrece recortar antes de subir.

---

# MÓDULO 5 — Agentes Especialistas (Features Específicos)

---

## ⚙️ 5.1 Agente de Puertas

**Descripción Técnica:**  
El especialista más importante dado que las puertas son la principal fuente de fallas en ascensores. El agente recibe la descripción del técnico (texto, foto del tablero, audio del mecanismo) y aplica el **framework de clasificación de estados de control de puertas**, deduciendo el estado mecánico subyacente (tensión de correa, desalineamiento de patines, falla del motor de puerta) sin conexión física al hardware.

**Justificación Científica:**  
- Framework de clasificación de tablero de control de puertas: *doc_id 47* (clasificación de fallas operativas/no operativas, alta precisión).  
- assInNNER para extraer "patín de puerta del piso 5": *doc_id 38* (F1+8.25% con pocos datos, entidades anidadas).  
- CNN + 2D-DWT para detección termográfica: *doc_id 5* (>90% precisión para desalineamiento motor puerta).  

**Requerimientos de Implementación:**
- `DoorAgentService`: lógica específica para clasificar síntomas de puertas.
- Árbol de decisión del agente:
  1. ¿Hay código de error en la imagen? → OCR → consulta KG.
  2. ¿Hay audio? → espectrograma → clasificar firma acústica.
  3. ¿Hay descripción de texto? → `OntologyService` → mapear a entidades.
  4. Cruzar los 3 inputs → diagnóstico probabilístico.
- Catálogo de fallas de puertas en el KG: mínimo 20 tipos de falla con descripciones, síntomas y soluciones.
- Si el diagnóstico identifica "tensión de correa", el agente consulta al `InventoryAgentService` si hay correas en stock antes de emitir la recomendación.

---

## ⚙️ 5.2 Agente de Motor / Tracción

**Descripción Técnica:**  
Analiza síntomas del motor de tracción del ascensor. Usa redes **LSTM** para detectar patrones temporales en el historial de fallas del equipo, y el pipeline de espectrogramas para analizar audios del motor. Puede predecir la **Vida Útil Restante (RUL)** del motor y anticipar fallas antes de que el ascensor quede fuera de servicio.

**Justificación Científica:**  
- LSTM para predicción de secuencias y vida útil restante: *doc_id 1* (commandos de voz + IBM Bluemix para informes de estado).  
- Transformada de Hilbert Huang para fallas incipientes en motores: *doc_id 3* (MAFAULDA dataset, NVIDIA Jetson Nano).  
- Transfer Learning CNN para flotas heterogéneas: *doc_id 45* (adaptación de dominio para velocidades variables).  
- Sistema de alerta temprana LSTM + atención: *doc_id 26* (AUROC 0.93, recall >90%, predicción 10 unidades antes).  

**Requerimientos de Implementación:**
- `MotorAgentService` con sub-módulos: `SpectrogramAnalyzer`, `RulPredictor`, `HistoryPatternMatcher`.
- `RulPredictor`: modelo BiLSTM cargado desde Supabase Storage, retorna `{ rul_days: number, confidence: number, uncertainty_range: [min, max] }`.
- Cuando `rul_days < 30`, el agente emite automáticamente una **Alerta de Mantenimiento Preventivo** persistida en la tabla `maintenance_alerts`.
- El agente accede al historial de tickets del ascensor via `HistoryAgentService.getTicketsByElevatorId(elevatorId)`.
- Adaptar el modelo base por marca de ascensor via `ModelAdapterRegistry` (LoRA adapters).

---

## ⚙️ 5.3 Agente de Logística e Inventario

**Descripción Técnica:**  
Cuando el Agente de Diagnóstico concluye que una pieza debe reemplazarse, el Orquestador **no emite la recomendación de reemplazo inmediatamente**. Primero consulta a este agente, que verifica el stock del repuesto. Si no hay stock, el agente sugiere una **medida de mitigación temporal** y genera automáticamente una orden de compra borrador.

**Justificación Científica:**  
- Optimización conjunta de mantenimiento + inventario: *doc_id 16* (GA superó PSO en 100 tareas; política integral redujo costos 211 unidades).  
- Deep Learning Bayesiano para planificación de compras bajo incertidumbre: *doc_id 15* (distribuciones de RUL para planificación flexible).  
- assInNNER para identificar pieza exacta de las notas de voz: *doc_id 38* (trazabilidad precisa de causa raíz).  

**Requerimientos de Implementación:**
- Tabla Supabase `spare_parts`: `{ id, name, part_number, brand_id, stock_qty, min_stock_threshold, supplier_id, lead_time_days }`.
- `InventoryAgentService.checkStock(partId)`: retorna `{ available: boolean, qty: number, eta_days?: number }`.
- Si `available = false`, el agente genera un `mitigation_recommendation`: "No hay correas en stock. Como medida temporal, ajuste la tensión del limitador de velocidad al mínimo operativo y agenda revisión en 48 h."
- Endpoint: `POST /api/inventory/draft-order` crea un borrador de orden de compra en la tabla `purchase_orders` para revisión del supervisor.
- Dashboard de inventario en el panel administrativo: tabla con stock actual, alertas de mínimo, y órdenes pendientes.

---

## ⚙️ 5.4 Agente de Reportes (Cierre Automático de Tickets)

**Descripción Técnica:**  
Al finalizar la conversación de diagnóstico y reparación, este agente lee todo el historial de la sesión de chat y genera automáticamente un **informe técnico estructurado** (en formato PDF o JSON). El reporte incluye: diagnóstico, acciones tomadas, piezas utilizadas, tiempo de intervención y recomendaciones futuras. El técnico solo confirma con un botón; no necesita escribir nada.

**Justificación Científica:**  
- GraphRAG + CoT para generar MGDs estructurados automáticamente: *doc_id 19* (reducción de trabajo manual, mejora de calidad).  
- AIOps agéntico con cierre automático de tickets sin intervención humana: *doc_id 24* (reducción MTTR, flujos de resolución autónomos).  
- IA agéntica proactiva que automatiza burocracia: *doc_id 32* (redacta reporte, etiqueta pieza, agenda siguiente visita).  

**Requerimientos de Implementación:**
- Trigger en el frontend: botón "Finalizar intervención" que envía `POST /api/tickets/{ticketId}/close`.
- `ReportAgentService.generateReport(sessionId)`:
  1. Lee todos los `chat_messages` de la sesión.
  2. Construye prompt: `"Basándote en esta conversación, genera un informe técnico con: [fecha, técnico, ascensor, síntomas reportados, diagnóstico, acciones realizadas, piezas utilizadas, recomendaciones]"`.
  3. Invoca al LLM con CoT para generar el JSON estructurado del reporte.
  4. Convierte el JSON a PDF usando `pdfkit` o `puppeteer`.
- Almacenar el PDF en Supabase Storage y el JSON en la tabla `service_reports`.
- Si el diagnóstico incluyó una pieza reemplazada, decrementar automáticamente el stock en `spare_parts`.

---

## ⚙️ 5.5 Agente Analista (Dashboard NL2VIS)

**Descripción Técnica:**  
El jefe de mantenimiento puede escribir en lenguaje natural en el dashboard: "¿Cuál es el ascensor con más fallas en el último mes?" o "Muéstrame el costo de mantenimiento por edificio en Q1". El agente transforma esa pregunta en una **consulta SQL**, la ejecuta contra la DB de Supabase, y genera una **visualización interactiva** (gráfico de barras, mapa de calor, línea de tiempo) directamente en el dashboard.

**Justificación Científica:**  
- NL2VIS con LLMs + LangChain/LangGraph para no-programadores: *doc_id 34* (LLMs superan arquitecturas clásicas en flexibilidad).  
- PDFLinearEWA para análisis eficiente de datos tabulares históricos: *doc_id 22* (MLP ligero vs Transformers gigantes, RMSE 0.169).  

**Requerimientos de Implementación:**
- `AnalystAgentService.query(naturalLanguageQuestion)`:
  1. LLM convierte la pregunta a SQL seguro (solo SELECT, schema restringido a vistas de solo lectura).
  2. Ejecutar SQL en Supabase.
  3. LLM decide el tipo de gráfico más apropiado para los datos devueltos.
  4. Retornar `{ chartType, data, title, insights }`.
- Frontend renderiza con `Chart.js` o `ApexCharts` (integrado en Angular).
- Implementar **allow-list de tablas consultables** por el agente analista para evitar acceso a datos sensibles.
- Cache de consultas frecuentes en Redis con TTL de 5 min.

---

## ⚙️ 5.6 Agente Causal — Diagnóstico de Causa Raíz

**Descripción Técnica:**  
No solo detecta qué falló, sino **por qué** falló. Implementa el framework IAEF: construye un **grafo causal** del evento a partir del historial de la sesión y los datos del KG, y usa un LLM para inferir si la falla fue por desgaste natural, uso incorrecto, falla de mantenimiento previo o falla en cascada de otro componente. La respuesta al técnico incluye la cadena causal, no solo la solución.

**Justificación Científica:**  
- IAEF: modelo causal dinámico revisado por LLM, grafos causales + teoría de la información: *doc_id 7* (transición de monitoreo pasivo a soporte proactivo).  
- Agente de Gemelo Digital con grafo de eventos: *doc_id 9* (mapa visual de eventos previos, aumento de confianza).  
- Validación cruzada entre agentes heterogéneos para filtrar alucinaciones: *doc_id 28* (MAS heterogéneo, FDI distribuido).  

**Requerimientos de Implementación:**
- `CausalAgentService.buildCausalGraph(elevatorId, currentFault)`:
  1. Consulta `service_reports` de los últimos 6 meses para el ascensor.
  2. Construye grafo causal: `FaultEvent → [trigger_event, component, timestamp]`.
  3. LLM analiza el grafo y genera la explicación causal en lenguaje natural.
- Output en el chat: `"La falla actual del sensor de puerta del piso 3 probablemente fue causada por: (1) el reemplazo incorrecto del patín hace 3 semanas (ticket #1042) que generó vibración excesiva, lo cual (2) desalineó el contacto magnético del sensor."`.
- Integrar `CausalAgentService` en el pipeline del Orquestador como paso opcional (se activa solo si el tipo de falla es recurrente: ≥3 ocurrencias en 90 días).

---

## ⚙️ 5.7 Agente de Aprendizaje Iterativo — Mejora Continua del Sistema

**Descripción Técnica:**  
Cada vez que un técnico confirma en el chat si el diagnóstico fue correcto o incorrecto, el sistema registra la retroalimentación. Matemáticamente inspirado en el **Control de Aprendizaje Iterativo (ILC)**: cada "iteración" (diagnóstico → reparación → confirmación) ajusta los pesos del sistema. Tras múltiples iteraciones del mismo tipo de falla reportada por distintos técnicos, el error de diagnóstico tiende a cero.

**Justificación Científica:**  
- ILC distribuido de tipo P para convergencia del error → 0: *doc_id 31* (lim error → 0 si ganancia < 0.5, sistemas cíclicos).  
- Aprendizaje de bucle cerrado: *doc_id 20* (LSTM + KNN + KG en taller automotriz, reducción de dependencia del operario).  

**Requerimientos de Implementación:**
- Botón en el frontend tras el cierre del ticket: "¿El diagnóstico fue correcto?" con opciones: Sí / No / Parcialmente.
- Endpoint: `POST /api/feedback/diagnosis` almacena en tabla `diagnosis_feedback`: `{ session_id, diagnosis_hypothesis_id, was_correct, actual_fault_confirmed }`.
- Job semanal (`CronJob` en NestJS): agrega el feedback por tipo de falla y recalibra los pesos de probabilidad del `DiagnosisAgentService`.
- KPI en el dashboard de administración: "Precisión del diagnóstico de la última semana" (% de diagnósticos confirmados como correctos).

---

# APÉNDICE — Resumen de Decisiones de Arquitectura

| Decisión | Elección | Justificación |
|---|---|---|
| Orquestador | LangGraph + NestJS | DAG nativo, soporte de pasos paralelos y control de estado |
| Base de datos vectorial | pgvector (Supabase) | Evitar stack adicional; integrado con PostgREST |
| Grafo de conocimiento | Neo4j (o ArangoDB) | Cypher queries para traversal de 2 saltos en KG |
| Queue de tareas pesadas | BullMQ + Redis | Nativo en NestJS, soporte de workers distribuidos |
| LLM principal | GPT-4o (con fallback a Mistral-7B) | Visión nativa, fallback económico para degradación |
| Fine-tuning | LoRA adapters por marca | <3% de parámetros ajustados, sin reentrenar el modelo base |
| Frontend | Angular PWA | Offline-first, Service Worker, TensorFlow.js nativo |
| Audio processing | Whisper STT + librosa | Open-source, desplegable en backend propio |
| PDF export | Puppeteer | HTML → PDF con soporte de imágenes y tablas |
| Observabilidad | LangSmith | Trazabilidad de cada llamada al LLM, detección de alucinaciones |

---

*Documento generado automáticamente a partir del análisis de 50 papers científicos. Trazabilidad: ver campo `documento_id` en `analisis_impacto.json`.*
