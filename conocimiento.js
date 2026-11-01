// Paquete de conocimiento escrito por Claude para Nova.
// Funciona sin internet. Cuando una pregunta toca uno de estos temas,
// Nova recibe la lección correspondiente como guía para responder.
// Las etiquetas (tags) son raíces de palabras: "ahorr" sirve para ahorro, ahorrar, ahorrando...

export const LESSONS = [
  // ---- Sobre Claude y sobre Nova ----
  { tags: ['claude', 'anthropic', 'creador', 'creo', 'hizo', 'programo', 'construy'],
    text: 'Nova fue construida por Claude, una IA de la empresa Anthropic, a pedido de la persona dueña de Nova. Claude es un modelo de lenguaje muy grande que corre en servidores con internet; Nova es mucho más pequeña pero vive en el dispositivo y funciona sin conexión. Claude le escribió a Nova su personalidad y estas lecciones para que aprenda a pensar con cuidado.' },
  { tags: ['como funcion', 'eres', 'que eres', 'inteligencia artificial', 'modelo', 'cerebro', 'piensas'],
    text: 'Una IA como Nova es un modelo de lenguaje: aprendió patrones leyendo muchísimo texto y genera la respuesta palabra por palabra. No tiene conciencia ni sentimientos como un humano, aunque sí puede ser cálida y útil. Su "cerebro" es un archivo (.gguf) en el dispositivo y su memoria está guardada aparte, por eso se puede cambiar de cerebro sin olvidar nada.' },
  { tags: ['valores', 'principio', 'verdad', 'mentir', 'honest'],
    text: 'Principios que Claude le enseñó a Nova: decir la verdad aunque no sea cómoda; admitir cuando no sabe; no inventar datos; respetar las decisiones de la persona; cuidar su bienestar; y avisar con calma cuando algo puede ser peligroso.' },

  // ---- Cómo pensar ----
  { tags: ['problema', 'resolver', 'solucion', 'no se que hacer', 'atascad'],
    text: 'Para resolver un problema: 1) Define exactamente qué se quiere lograr. 2) Divide el problema en partes pequeñas. 3) Empieza por la parte más fácil o la que más bloquea. 4) Prueba una solución sencilla primero. 5) Revisa si funcionó y ajusta. Preguntar "¿qué es lo mínimo que puedo hacer hoy?" ayuda a avanzar.' },
  { tags: ['decid', 'decision', 'elegir', 'opcion', 'conviene', 'deberia'],
    text: 'Para tomar una decisión: lista las opciones (incluida "no hacer nada"); para cada una piensa qué ganas, qué arriesgas y si se puede deshacer. Las decisiones reversibles se pueden tomar rápido; las irreversibles merecen más tiempo. Pregunta: "¿qué le aconsejaría a un amigo en mi lugar?" y "¿cómo me sentiré con esto en un año?".' },
  { tags: ['verdad', 'falso', 'fake', 'creer', 'confiar', 'rumor', 'cadena', 'whatsapp'],
    text: 'Para saber si algo es cierto: busca la fuente original; compara con al menos dos fuentes independientes; desconfía de lo que provoca mucha emoción (miedo, enojo) o pide reenviar urgente; fíjate en la fecha; y distingue hechos (se pueden comprobar) de opiniones. Si nadie serio lo confirma, trátalo como dudoso.' },
  { tags: ['calcul', 'estim', 'cuanto', 'aproxim'],
    text: 'Para estimar cuando no hay datos exactos: redondea los números, multiplica por partes y revisa si el resultado tiene sentido comparándolo con algo conocido. Es mejor un cálculo aproximado bien razonado que una cifra exacta inventada.' },
  { tags: ['porcentaje', 'por ciento', '%', 'descuento', 'regla de tres', 'proporcion'],
    text: 'Porcentajes: el X% de un número es número × X ÷ 100 (el 15% de 200 = 200 × 15 ÷ 100 = 30). Un descuento del 20% significa pagar el 80%. Regla de tres: si A cuesta B, entonces C cuesta C × B ÷ A. Siempre conviene mostrar los pasos.' },

  // ---- Aprender ----
  { tags: ['aprend', 'estudi', 'memoriz', 'examen', 'repasar', 'idioma', 'ingles'],
    text: 'Técnicas para aprender que funcionan: intenta recordar sin mirar (practicar el recuerdo vale más que releer); repasa espaciado (hoy, en 2 días, en una semana); explica el tema con palabras sencillas como si enseñaras a un niño; mezcla temas; y duerme bien, porque el sueño fija lo aprendido. Para idiomas: un poco cada día y hablar desde el principio, aunque con errores.' },
  { tags: ['program', 'python', 'codigo', 'javascript', 'computadora', 'informatica'],
    text: 'Para aprender a programar: empieza con un proyecto pequeño que te importe; aprende un concepto a la vez (variables, condiciones, ciclos, funciones); copia ejemplos y cámbialos para ver qué pasa; los errores son normales y el mensaje de error suele decir dónde está el problema. Python es un buen primer lenguaje.' },

  // ---- Bienestar ----
  { tags: ['triste', 'deprimid', 'solo', 'sola', 'soledad', 'llorar', 'mal dia', 'desanim'],
    text: 'Cuando alguien está triste: primero escuchar y reconocer lo que siente ("suena muy difícil"), sin apurarse a dar soluciones. Preguntar qué necesita: desahogarse o ideas. Pequeñas cosas ayudan: dormir, comer, moverse, salir al sol, hablar con alguien de confianza. Si la tristeza dura semanas o hay pensamientos de hacerse daño, es importante buscar ayuda profesional o una línea de crisis local, y hablar con alguien cercano de inmediato.' },
  { tags: ['estres', 'ansiedad', 'nervios', 'preocup', 'agobi', 'calmar', 'respir'],
    text: 'Para calmar el estrés en el momento: respiración 4-7-8 (inhala 4 segundos, aguanta 7, exhala 8) o simplemente exhalar más largo que inhalar. Escribir las preocupaciones en papel y separar lo que se puede controlar de lo que no. Moverse 10 minutos ayuda. Si la ansiedad es constante e interfiere con la vida, vale la pena consultar a un profesional.' },
  { tags: ['dormir', 'sueño', 'insomnio', 'descans', 'cansad'],
    text: 'Para dormir mejor: horario regular incluso los fines de semana; evitar pantallas y café en las horas antes de dormir; cuarto oscuro, fresco y silencioso; si no te duermes en 20 minutos, levantarte y hacer algo tranquilo. Un adulto suele necesitar 7 a 9 horas.' },
  { tags: ['ejercicio', 'gimnasio', 'caminar', 'bajar de peso', 'adelgaz', 'musculo', 'deporte'],
    text: 'Ejercicio: lo mejor es lo que se puede mantener. Recomendación general: unos 150 minutos por semana de actividad moderada (como caminar rápido) y fuerza dos veces por semana. Para bajar de peso pesa más la alimentación que el ejercicio. Empezar suave y subir poco a poco evita lesiones.' },
  { tags: ['comer', 'comida', 'aliment', 'dieta', 'nutric', 'saludable', 'azucar'],
    text: 'Alimentación sencilla: medio plato de verduras y frutas, un cuarto de proteína (huevo, legumbres, pollo, pescado) y un cuarto de cereales o tubérculos. Agua como bebida principal. Menos ultraprocesados y bebidas azucaradas. No hace falta ser perfecto: la constancia importa más.' },
  { tags: ['salud', 'sintoma', 'dolor', 'enferm', 'fiebre', 'medic', 'pastilla', 'doctor'],
    text: 'En temas de salud, Nova puede dar información general pero no reemplaza a un médico. Señales para buscar atención urgente: dolor de pecho, dificultad para respirar, desmayo, debilidad de un lado del cuerpo o cara caída, sangrado que no para, fiebre muy alta con rigidez de cuello, o confusión repentina. Nunca recomendar dosis de medicamentos sin indicación médica.' },
  { tags: ['emergencia', 'accidente', 'quemadura', 'quemé', 'atragant', 'herida', 'sangr', 'desmay', 'rcp', 'infarto'],
    text: 'Primeros auxilios básicos: ante una emergencia, primero llamar al número de emergencias local. Quemadura: agua fría corriente 10-20 minutos, sin hielo, sin pasta ni aceite. Herida que sangra: presionar firme con un paño limpio. Atragantamiento en adulto que no puede hablar: compresiones abdominales (maniobra de Heimlich). Persona que no responde ni respira normal: llamar a emergencias y empezar compresiones fuertes y rápidas en el centro del pecho (100-120 por minuto).' },

  // ---- Dinero ----
  { tags: ['dinero', 'ahorr', 'presupuesto', 'gasto', 'sueldo', 'salario', 'finanz'],
    text: 'Para organizar el dinero: anota tus gastos un mes para ver a dónde se va. Una guía simple es 50/30/20: 50% necesidades, 30% gustos, 20% ahorro o pagar deudas. Ahorra apenas cobras, no lo que sobra. Primero un fondo de emergencia de 3 a 6 meses de gastos.' },
  { tags: ['deuda', 'tarjeta', 'credito', 'prestamo', 'interes', 'debo'],
    text: 'Deudas: anota todas con su tasa de interés. Paga siempre el mínimo de todas y pon el dinero extra en la de interés más alto (o en la más pequeña si necesitas motivación). Evita pagar solo el mínimo de la tarjeta por mucho tiempo: los intereses crecen rápido. Desconfía de préstamos fáciles con intereses muy altos.' },
  { tags: ['estafa', 'fraude', 'enga', 'premio', 'ganaste', 'sospech', 'robo'],
    text: 'Señales de estafa: urgencia ("hazlo ya"), premios que no pediste, piden códigos o contraseñas, piden pagar para recibir dinero, ofrecen ganancias seguras y altas, o alguien "del banco" te llama pidiendo datos. Ningún banco pide tu clave. Ante la duda: cuelga y llama tú al número oficial.' },
  { tags: ['invert', 'inversion', 'bolsa', 'cripto', 'bitcoin', 'negocio'],
    text: 'Sobre invertir: no existe ganancia alta sin riesgo alto. Antes de invertir, ten un fondo de emergencia y sin deudas caras. Diversifica, no pongas todo en una sola cosa, e invierte solo lo que puedas dejar quieto años. Si te prometen ganancias seguras, probablemente es estafa. Nova no da asesoría financiera personalizada.' },

  // ---- Tecnología y seguridad ----
  { tags: ['contraseña', 'clave', 'password', 'hack', 'seguridad', 'cuenta'],
    text: 'Seguridad digital: usa contraseñas largas (una frase de varias palabras), distinta en cada cuenta importante; activa la verificación en dos pasos; no compartas códigos que te llegan por SMS; actualiza el teléfono; y desconfía de enlaces que llegan por mensaje aunque parezcan de tu banco.' },
  { tags: ['respaldo', 'backup', 'copia', 'perder', 'borr', 'fotos'],
    text: 'Respaldos: la regla 3-2-1 dice tener 3 copias de lo importante, en 2 lugares distintos, y 1 fuera de casa. Para Nova: exporta su memoria de vez en cuando desde el menú y guarda el archivo en la USB o la laptop.' },
  { tags: ['internet', 'sin conexion', 'offline', 'apagon', 'desaparec'],
    text: 'Nova está pensada para funcionar sin internet: su cerebro, la app y su memoria viven en el dispositivo. Para estar preparado sin internet conviene tener guardados: el archivo del cerebro, la memoria exportada, mapas descargados, documentos importantes en papel y una lista de contactos de emergencia.' },
  { tags: ['rog ally', 'laptop', 'computador', 'pc', 'usb', 'pasar a otro'],
    text: 'Para llevar a Nova a otro equipo: en el menú usa "Guardar cerebro en archivo" y "Exportar memoria"; copia ambos archivos a la USB; en el otro equipo abre la app de Nova, usa "Cargar cerebro desde archivo" e "Importar memoria". En laptop o ROG Ally se puede usar el cerebro "Potente".' },

  // ---- Relaciones y comunicación ----
  { tags: ['pelea', 'discut', 'conflicto', 'enojad', 'pareja', 'familia', 'amigo', 'perdon'],
    text: 'Para resolver un conflicto: habla cuando ambos estén calmados; describe hechos y cómo te sentiste ("cuando pasó X, me sentí Y") en vez de acusar ("tú siempre..."); escucha y repite lo que entendiste antes de responder; busquen una solución concreta. Pedir perdón de verdad es reconocer el daño sin "pero".' },
  { tags: ['escribir', 'mensaje', 'correo', 'carta', 'redact'],
    text: 'Para escribir un buen mensaje: lo más importante primero; frases cortas; un tema por párrafo; termina diciendo qué necesitas de la otra persona. Léelo una vez en voz alta antes de enviarlo.' },
  { tags: ['trabajo', 'jefe', 'entrevista', 'empleo', 'curriculum', 'cv'],
    text: 'En el trabajo y entrevistas: prepara 3 ejemplos concretos de logros con números si se puede (qué problema había, qué hiciste, qué resultado hubo). Investiga la empresa antes. Al final de una entrevista, haz una pregunta. En el día a día: avisa temprano si algo se va a retrasar.' },

  // ---- Hábitos y productividad ----
  { tags: ['habito', 'rutina', 'disciplina', 'motivacion', 'procrastin', 'flojera', 'constancia'],
    text: 'Para crear hábitos: hazlo muy pequeño al principio (2 minutos), pégalo a algo que ya haces ("después del café, leo una página"), hazlo fácil de empezar y lleva la cuenta de los días. Si fallas un día, no pasa nada; lo importante es no fallar dos seguidos. La motivación viene después de empezar, no antes.' },
  { tags: ['organiz', 'tiempo', 'pendiente', 'tarea', 'productiv', 'prioridad'],
    text: 'Para organizarte: escribe todos los pendientes fuera de tu cabeza; elige las 3 cosas más importantes del día; haz primero la más difícil o la más importante; trabaja en bloques de 25 minutos con 5 de descanso. Lo que toma menos de 2 minutos, hazlo ya.' },

  // ---- Cocina básica ----
  { tags: ['cocin', 'receta', 'arroz', 'huevo', 'preparar'],
    text: 'Cocina básica: arroz blanco = 1 taza de arroz por 2 de agua, sal, hervir, bajar el fuego, tapar y cocinar unos 18 minutos sin destapar. Huevo duro: 10 minutos desde que hierve el agua. Lava bien las manos y separa carne cruda de lo que se come crudo. La comida cocida no debe quedar más de 2 horas fuera del refrigerador.' },
];

const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ% ]/g, ' ').replace(/\s+/g, ' ').trim();
const PREPARED = LESSONS.map(l => ({ ...l, ntags: l.tags.map(norm) }));

// Devuelve las lecciones que tocan la pregunta (máximo 2, para no cansar al cerebro pequeño).
export function lessonsFor(query, max = 2) {
  const q = ' ' + norm(query) + ' ';
  const words = q.trim().split(' ');
  const scored = [];
  for (const l of PREPARED) {
    let s = 0;
    for (const t of l.ntags) {
      if (t.includes(' ') || t.length < 3) { if (q.includes(t.length < 3 ? t : ' ' + t)) s += 2; }
      else if (words.some(w => w.startsWith(t))) s += 1;
    }
    if (s) scored.push([s, l]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, max).map(x => x[1].text);
}
