# All Things Agentic Hackathon — Plan de Proyecto

**Deadline:** 31 ago 2026, 7:00pm GMT-5 (5:00pm PT)
**Track:** Taskmaster
**Modalidad:** Solo
**Autor:** Mateo Solórzano

---

## 1. Contexto del hackathon

**Nombre:** All Things Agentic Hackathon
**Organiza:** Google LLC (Sponsor) — Administra: Devpost, Inc.
**Modalidad:** Online, pública
**Participantes registrados:** ~5,340–5,962 y subiendo (creciendo conforme se acerca el deadline)
**Pool de premios total:** $180,000 en efectivo

### 1.1 Fechas clave

- **Inicio del contest:** 3 ago 2026, 9:00 AM PT
- **Submission Period (ventana para construir y enviar):** 3 ago 2026 9:00 AM PT → **31 ago 2026, 5:00 PM PT (7:00 PM GMT-5)**
- **Judging Period:** 1 sept 2026 9:00 AM PT → 1 oct 2026 11:45 PM PT
- **Anuncio de ganadores:** alrededor del 8 oct 2026, 10:00 AM PT
- **Deadline para pedir créditos GCP:** 28 ago 2026, 12:00 PM PT (o hasta agotar cupo)

### 1.2 Elegibilidad y restricciones legales

- Debes tener la mayoría de edad legal en tu país de residencia al 3 ago 2026 (20 años en Taiwán como excepción).
- Debes tener acceso a internet al 3 ago 2026.
- **Países/territorios excluidos:** Italia, Quebec, Crimea, Cuba, Irán, Siria, Corea del Norte, Sudán, Bielorrusia, Rusia, y cualquier país bajo sanciones de la OFAC (EE.UU.).
- No pueden participar empleados, contratistas ni directivos de Google, Devpost, ni organizaciones involucradas en el contest, ni sus familiares/hogares directos.
- Se puede participar como individuo, equipo u organización — en cualquier caso, el proyecto debe ser trabajo original y de propiedad exclusiva del(los) entrant(s).

### 1.3 Premios y cómo se distribuyen (métricas de referencia)

| Premio                                                                      | Monto   | Créditos GCP incluidos | Ganadores |
| --------------------------------------------------------------------------- | ------- | ----------------------- | --------- |
| Grand Prize (mejor de todas las categorías)                                | $50,000 | $5,000                  | 1         |
| The Taskmaster                                                              | $20,000 | $2,000                  | 1         |
| The Collaborative Partner                                                   | $20,000 | $2,000                  | 1         |
| The Fortified Enterprise Fleet                                              | $20,000 | $2,000                  | 1         |
| Startup Excellence (requiere organización incorporada + email corporativo) | $20,000 | $5,000                  | 1         |
| Individual/Hobbyist (Best Team/Solo Build)                                  | $10,000 | $1,000                  | 2         |
| Best Architectural Design                                                   | $5,000  | $1,000                  | 2         |
| Best Multimodal UX                                                          | $5,000  | $1,000                  | 2         |
| Honorable Mentions                                                          | $2,000  | $500                    | 5         |

Cada proyecto es elegible para un máximo de **un solo premio**. Como voy solo y sin organización incorporada, mis categorías realistas son: **The Taskmaster**, **Individual/Hobbyist**, **Best Architectural Design**, **Best Multimodal UX**, **Honorable Mention**, y el **Grand Prize** (que compite contra todas las categorías).

### 1.4 Proceso de judging (3 etapas)

- **Etapa 1 — Pass/Fail:** ¿el submission cumple todos los requisitos, aborda razonablemente el challenge y aplica los requisitos técnicos obligatorios? Si falla aquí, queda fuera sin importar la calidad de la idea.
- **Etapa 2 — Score ponderado (1 a 5 por criterio, promediado):**
  - **Innovation & Operational Utility — 40%**: ¿el agente actúa de forma autónoma sobre fricción real, no solo responde chat?
  - **Architectural Discipline & Tech Stack — 30%**: decisiones de ingeniería, manejo de estado, aislamiento de herramientas, tolerancia a fallos.
  - **Demo & Production Readiness — 30%**: claridad del video, prueba de ejecución en vivo, documentación, diagrama de arquitectura, evidencia de despliegue en Google Cloud.
- **Etapa 3 — Bonus (hasta +1.0 punto sobre el score final, máximo total = 6):**
  - Contenido público sobre el proyecto (blog/podcast/video), debe decir que se hizo para el hackathon → +0.2
  - Post en redes sociales con **#AllThingsAgenticHackathon** → +0.2
  - Integrar otro modelo de Google AI (Gemma, Veo, Lyria) → +0.2 c/u, máx +0.6
- Empates se resuelven comparando el score por criterio en el orden listado arriba; si persiste, votan los jueces.
- Ganadores potenciales tienen **2 días** para responder a la notificación o se descalifican y se elige un alterno.

### 1.5 Tecnología obligatoria (todos los tracks)

- Gemini 3.5 o superior (vía Gemini API o Vertex AI)
- Al menos un framework de agentes de Google: ADK, GenAI SDK, Antigravity SDK o Genkit
- Al menos un servicio de infraestructura de Google Cloud: Cloud Run, Cloud SQL, Firestore, GKE, Pub/Sub

### 1.6 Por qué Taskmaster (y no Collaborative Partner o Fortified Enterprise Fleet)

- Mi experiencia en Neo Consulting encaja directo con el foco del track: workflows event-driven con enrutamiento autónomo (AI Helpdesk vía WhatsApp, agente evaluador en n8n, herramienta de monitoreo con Cloud Function + Gemini).
- Menor superficie de riesgo en 6 días trabajando solo, comparado con memoria persistente + RAG (Collaborative Partner) o arquitectura multi-agente con Registry/Gateway/Model Armor/Observability (Fortified Enterprise Fleet).
- El criterio "Bring Your Own Friction" (BYOF) premia resolver un problema real y personal — tengo varios de mi día a día.

### 1.7 Reglas de submission y modificación

- **Antes del deadline:** se pueden guardar borradores y actualizar el submission todas las veces que quiera.
- **Después del 31 ago 5:00 PM PT:** cero ediciones al submission (video, repo, sitio en vivo deben quedar exactamente igual hasta que se anuncien ganadores). Solo se permite seguir actualizando el proyecto en el portfolio de Devpost, no el submission evaluado.
- Excepción: Sponsor/Devpost pueden autorizar modificaciones puntuales post-deadline solo para remover contenido que infrinja marcas/derechos, exponga datos personales, o sea inapropiado — el resto debe quedar sustancialmente igual.
- Se pueden enviar **varios proyectos**, pero deben ser sustancialmente distintos entre sí; cada uno con máximo 1 premio.
- El proyecto debe ser **código nuevo creado durante el Submission Period** (3–31 ago). Se permite usar frameworks, librerías, templates y asistentes de IA, pero cualquier código o trabajo preexistente incorporado debe declararse.
- Repo puede ser privado, pero hay que dar acceso a `testing@devpost.com` y `cloudhackathons@google.com`.
- El video debe tener máximo 4 minutos (solo se evalúan los primeros 4 si es más largo), público en YouTube o Vimeo, en inglés o con subtítulos en inglés, y debe demostrar visualmente que el backend corre en Google Cloud.
- Todo el material del submission debe estar en inglés (o con traducción al inglés incluida).
- Prohibido: contenido derogatorio/ofensivo/discriminatorio, publicidad o marcas de terceros no autorizadas, y cualquier violación de derechos de propiedad intelectual de terceros.

### 1.8 Recursos disponibles

**Créditos GCP:**

- Free trial (sin costo): `cloud.google.com/free`
- $150 en créditos específicos del hackathon vía formulario — un código por entrant, revisión hasta 72h hábiles, no garantizado. **Pedir hoy mismo**, antes del 28 ago 12:00 PM PT.
- Tip para que aprueben el formulario: nombrar uno de los 3 tracks oficiales (no inventar uno) y mantener la descripción del proyecto en 1–2 frases.

**GEAR (Gemini Enterprise Agent Ready):** programa gratuito de Google Developer Program, sin prerrequisitos. Da 35 créditos mensuales de aprendizaje en Google Skills, labs prácticos y badges. Empezar por el path "Introduction to Agents".

**Webinars (grabados, disponibles en Resources):**

- 11 ago — *Architecting Multi-Agent Teams: los 3 patrones de orquestación de ADK*
- 13 ago — *Build a Long-Running Agent: workflows persistentes con ADK*
- 20 ago — *Build a Self-Evolving Agent*
- 27 ago — *Architecting Agent Memory: session state, vector search, Memory Bank* (relevante si en algún momento se quiere agregar memoria al Follow-up Agent)

**Tips de costo (importantes dado el presupuesto limitado):**

- Usar Gemini Flash por defecto, reservar Pro solo para razonamiento complejo final.
- Min instances en 0 (scale to zero) para no pagar por tiempo inactivo.
- Poner topes de instancias máximas para evitar picos inesperados.
- Usar vector search serverless en vez de clusters siempre activos (no aplica directo a esta idea, pero por si se agrega RAG).
- Mantener el almacenamiento liviano y limpiar artefactos temporales.
- Activar alertas de presupuesto en la consola de GCP.
- Proteger endpoints públicos (Cloud Run/Functions) con API keys o auth.
- Grabar la prueba de que el agente corrió en GCP para el video, y **apagar todo después** para no seguir gastando créditos.

### 1.9 Propiedad intelectual y publicidad

- El proyecto sigue siendo de mi propiedad — no cedo los derechos.
- Al entrar, le doy a Google una licencia perpetua, irrevocable, mundial, gratuita y no exclusiva para usar, reproducir, adaptar y mostrar el proyecto con fines de (1) evaluación del contest y (2) promoción/publicidad (screenshots, clips de video, etc.).
- Acepto que puedan usar mi nombre, voz, opiniones y ciudad/país de residencia con fines promocionales del contest.

### 1.10 Uso de IA — qué sí y qué no

**Sí:**

- Narrar el demo video (voz propia o TTS), siempre que la narración sea precisa.
- Usar asistentes de IA para scaffolding, debugging e iterar más rápido.
- Redactar y pulir el write-up, el README y las etiquetas del diagrama de arquitectura.
- Hacer brainstorming de edge cases y escenarios de prueba.

**No:**

- Poner un nombre genérico generado por IA al proyecto (evitar cosas tipo "AgentFlow", "TaskPilot").
- Describir el proyecto en términos vagos ("usamos IA para el backend" es débil; hay que ser específico).
- Fingir o exagerar lo que realmente está corriendo — debe mostrarse funcionando de verdad, con prueba real de despliegue en GCP.
- Envolver un chatbot genérico en una UI bonita y llamarlo "agente" — los jueces buscan acción autónoma real.

### 1.11 Restricción de canal detectada

- **No puedo usar WhatsApp Business Cloud API** para este proyecto: el número que usé antes es de la empresa (Neo Consulting) y sacar uno nuevo requiere verificación de Meta Business, inviable en el plazo.
- **Reemplazo elegido: Telegram Bot API.** Gratis, sin verificación de negocio, soporta texto, notas de voz, fotos y webhooks — reemplazo casi 1:1 de lo que se planeaba hacer con WhatsApp.

---

## 2. Idea elegida: "De la reunión a la tarea" — Agente de actas y seguimiento autónomo

**El problema real:** Coordino stakeholders y equipos constantemente (rol actual: Jr. Agentic AI Consultant). Las reuniones generan compromisos que se pierden si nadie los documenta y le da seguimiento activo.

**Flujo del agente (dos agentes con Google ADK):**

1. **Extraction Agent**

   - Trigger: nota de voz o texto enviado por Telegram
   - Transcribe (si es audio) y extrae action items (dueño, descripción, fecha) usando Gemini, en JSON estructurado
   - Guarda las tareas en Firestore
   - Confirma por Telegram lo que se registró
2. **Follow-up Agent**

   - Trigger: Cloud Scheduler (corre periódicamente, ej. diario)
   - Revisa el estado de las tareas pendientes en Firestore
   - Decide autónomamente si mandar un recordatorio, y con qué tono/urgencia (usando Gemini)
   - **Twist de innovación:** contador de intentos en Firestore. Después de 2 recordatorios sin respuesta, escala automáticamente (cambia el tono del mensaje o notifica a otra persona) — esto es lo que demuestra autonomía real, no solo automatización de un paso.

---

## 3. Arquitectura técnica

| Requisito             | Elección                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| Modelo                | Gemini 3.5+ — transcripción, extracción JSON, redacción de mensajes                             |
| Framework de agentes  | Google ADK — 2 agentes: Extraction Agent + Follow-up Agent                                         |
| Infra GCP             | Cloud Functions (webhook receptor), Firestore (estado/tareas), Cloud Scheduler (trigger periódico) |
| Canal de interacción | Telegram Bot API                                                                                    |
| Frontend              | Dashboard mínimo en React leyendo Firestore (ver tareas, marcar como hechas)                       |

---

## 4. Cómo esto conecta con los criterios de evaluación

**Innovation & Operational Utility (40%)**
El criterio pide: "¿el agente intercepta y completa un flujo de trabajo de varios pasos en segundo plano, sin intervención humana?" El ciclo de extracción + seguimiento + escalación autónoma responde directo a eso — no es solo un paso automatizado, es una decisión tomada por el agente sin que yo intervenga.

**Architectural Discipline & Tech Stack (30%)**
Separación clara de responsabilidades entre 2 agentes (Extraction / Follow-up), manejo de estado explícito en Firestore, arquitectura fácil de documentar en un diagrama limpio.

**Demo & Production Readiness (30%)**
El video puede mostrar: (1) en vivo, una nota de voz que se convierte en tarea; (2) evidencia de una ejecución programada anterior donde el agente ya escaló un recordatorio solo — prueba de que corre sin supervisión.

---

## 5. Plan día a día (25–31 ago 2026)

- **Día 1 (25 ago, hoy):** Pedir créditos GCP ($150, antes del 28 ago 12pm PT — la revisión toma hasta 72h). Crear bot de Telegram (@BotFather). Crear proyecto GCP + Firestore. Scaffold de Cloud Function + Google ADK.
- **Día 2 (26 ago):** Extraction Agent completo: voz/texto → Gemini → JSON de tareas → Firestore → confirmación en Telegram.
- **Día 3 (27 ago):** Dashboard React mínimo (ver tareas, marcar como hechas) + lógica de estado.
- **Día 4 (28 ago):** Follow-up Agent: Cloud Scheduler + lógica de recordatorio + escalación autónoma.
- **Día 5 (29 ago):** Deploy limpio, pruebas end-to-end, README con spin-up instructions, diagrama de arquitectura.
- **Día 6 (30 ago):** Grabar demo (≤4 min), redactar texto de submission, extras opcionales (bonus).
- **31 ago:** Colchón para imprevistos, enviar con margen antes de las 7:00pm GMT-5.

---

## 6. Checklist de submission (obligatorio)

- [ ] Categoría seleccionada: Taskmaster
- [ ] URL al proyecto hosteado (recomendado, no obligatorio)
- [ ] Descripción de texto: features, tecnologías usadas, fuentes de datos, aprendizajes
- [ ] URL a repo (GitHub/GitLab/Bitbucket) — si es privado, dar acceso a testing@devpost.com y cloudhackathons@google.com
- [ ] README con spin-up instructions paso a paso (aunque los jueces no lo corran, prueba reproducibilidad)
- [ ] Diagrama de arquitectura claro (Gemini ↔ backend ↔ base de datos ↔ frontend)
- [ ] Video demo ≤4 min, público en YouTube/Vimeo, en inglés o con subtítulos en inglés
- [ ] El video debe demostrar que el backend corre en Google Cloud (Cloud Console, Cloud Run dashboard, logs de Vertex AI, o URL .run)

---

## 7. Extras opcionales (bonus, hasta +1.0 punto sobre el score final de 6)

- Contenido público (blog/podcast/video) sobre cómo construiste el proyecto — debe decir explícitamente que se hizo para este hackathon (+0.2)
- Post en redes sociales con el hashtag **#AllThingsAgenticHackathon** (+0.2)
- Integrar otro modelo de Google AI (Gemma, Veo o Lyria) — +0.2 por cada uno, máximo +0.6

---

## 8. Contexto del CV (para mantener coherencia de historia y skills en el demo)

**Mateo Solórzano** — Full-Stack egresado UNI (Top 10%), Jr. Agentic AI Consultant en Neo Consulting.

**Stack relevante:**
React/TSX, Node.js, Python, GCP (Cloud Functions, Cloud Run, Firebase), Gemini API, LangChain, n8n, RAG, WhatsApp Business Platform, Firestore, SQL Server.

**Experiencia directa relacionada al proyecto:**

- AI Helpdesk integrando WhatsApp Cloud API con portal web (reducción de tiempo de respuesta de 2 días a 30 min)
- Agente evaluador en n8n con LLM (reducción de análisis de candidatos de 2 horas a 2 minutos)
- Herramienta de monitoreo con Cloud Function + Gemini API
- Coordinación de stakeholders y equipos como parte de su rol actual

---

## 9. Próximos pasos (a continuar en Claude Code)

- [ ] Definir esquema de datos de Firestore (colecciones sugeridas: `tasks`, `reminders`, `escalations`)
- [ ] Diseñar los prompts de los 2 agentes (Extraction Agent, Follow-up Agent)
- [ ] Definir el contrato del webhook de Telegram (endpoints, formato de mensajes entrantes/salientes)
- [ ] Setup de Google ADK: estructura de proyecto, configuración de agentes y herramientas
- [ ] Diagrama de arquitectura (para el README y el submission)
- [ ] Definir estrategia de datos de prueba/demo para el video
