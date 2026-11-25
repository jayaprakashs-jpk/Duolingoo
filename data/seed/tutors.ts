// Offline conversation kits for the AI Video Call. `t` is the tutor line (target language),
// `n` is the translation in the learner's native language. Keys are normalized (lowercase, no accents).
import type { TutorKit } from '../types';

export const ENGLISH_TUTOR_FOR_TAMIL: TutorKit = {
  openers: [
    { t: 'Hi! I am Lily, your English tutor. How are you today?', n: 'வணக்கம்! நான் லில்லி, உங்கள் ஆங்கில ஆசிரியர். இன்று எப்படி இருக்கிறீர்கள்?' },
  ],
  topics: [
    {
      keys: ['bye', 'goodbye', 'see you', 'good night', 'talk later'],
      replies: [{ t: 'Goodbye! You spoke very well today. See you soon!', n: 'போய் வருகிறேன்! இன்று நீங்கள் நன்றாகப் பேசினீர்கள். விரைவில் சந்திப்போம்!' }],
    },
    {
      keys: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'good afternoon'],
      replies: [
        { t: 'Hello! It is so nice to talk with you. How are you today?', n: 'வணக்கம்! உங்களுடன் பேசுவது மகிழ்ச்சி. இன்று எப்படி இருக்கிறீர்கள்?' },
      ],
    },
    {
      keys: ['my name', 'name is', 'call me'],
      replies: [{ t: 'Nice to meet you! Where are you from?', n: 'உங்களை சந்தித்ததில் மகிழ்ச்சி! நீங்கள் எங்கிருந்து வருகிறீர்கள்?' }],
    },
    {
      keys: ['fine', 'good', 'great', 'happy', 'tired', 'sad', 'okay', 'ok', 'well', 'not bad', 'sleepy'],
      replies: [
        { t: 'I am glad to hear that! What did you do today?', n: 'அதைக் கேட்க மகிழ்ச்சி! இன்று என்ன செய்தீர்கள்?' },
        { t: 'I see. Tell me more about your day.', n: 'சரி. உங்கள் நாளைப் பற்றி இன்னும் சொல்லுங்கள்.' },
      ],
    },
    {
      keys: ['india', 'tamil', 'chennai', 'madurai', 'coimbatore', 'from', 'live', 'village', 'city'],
      replies: [
        { t: 'That sounds wonderful! Tell me about your family.', n: 'அது அருமை! உங்கள் குடும்பத்தைப் பற்றி சொல்லுங்கள்.' },
      ],
    },
    {
      keys: ['mother', 'father', 'brother', 'sister', 'family', 'parents', 'wife', 'husband', 'son', 'daughter', 'amma', 'appa'],
      replies: [
        { t: 'Family is important. What do they do?', n: 'குடும்பம் முக்கியம். அவர்கள் என்ன வேலை செய்கிறார்கள்?' },
        { t: 'That is nice. Do you live together?', n: 'நல்லது. நீங்கள் ஒன்றாக வசிக்கிறீர்களா?' },
      ],
    },
    {
      keys: ['work', 'job', 'office', 'student', 'study', 'teacher', 'engineer', 'school', 'college', 'company'],
      replies: [
        { t: 'That is interesting! Do you like it?', n: 'சுவாரஸ்யம்! உங்களுக்குப் பிடிக்குமா?' },
        { t: 'What is the best part of your day at work?', n: 'வேலையில் உங்கள் நாளின் சிறந்த பகுதி எது?' },
      ],
    },
    {
      keys: ['food', 'eat', 'rice', 'dinner', 'lunch', 'breakfast', 'hungry', 'drink', 'tea', 'coffee', 'dosa', 'idli'],
      replies: [
        { t: 'Yum! What is your favorite food?', n: 'ஆஹா! உங்களுக்குப் பிடித்த உணவு எது?' },
        { t: 'Can you cook? What do you cook?', n: 'உங்களுக்கு சமைக்கத் தெரியுமா? என்ன சமைப்பீர்கள்?' },
      ],
    },
    {
      keys: ['like', 'love', 'music', 'movie', 'movies', 'cricket', 'sport', 'read', 'dance', 'hobby', 'play', 'game'],
      replies: [
        { t: 'Nice! How often do you do that?', n: 'நல்லது! எத்தனை முறை செய்வீர்கள்?' },
        { t: 'That sounds fun. Who do you do it with?', n: 'மகிழ்ச்சியாக இருக்கும். யாருடன் செய்வீர்கள்?' },
      ],
    },
    {
      keys: ['weather', 'hot', 'rain', 'cold', 'sunny', 'summer', 'monsoon'],
      replies: [{ t: 'The weather can change fast. Do you like the rain?', n: 'வானிலை வேகமாக மாறும். உங்களுக்கு மழை பிடிக்குமா?' }],
    },
  ],
  fallbacks: [
    { t: 'That is interesting. Can you tell me more?', n: 'சுவாரஸ்யம். இன்னும் சொல்ல முடியுமா?' },
    { t: 'Could you say that in a different way?', n: 'வேறு விதமாகச் சொல்ல முடியுமா?' },
    { t: 'I want to hear more. What do you think?', n: 'இன்னும் கேட்க விரும்புகிறேன். நீங்கள் என்ன நினைக்கிறீர்கள்?' },
  ],
  fixes: [
    { re: '\\bme name\\b', hint: 'Use "my" before a noun, not "me".', better: 'My name is ...' },
    { re: '\\bi (is|are)\\b', hint: 'With "I" always use "am".', better: 'I am ...' },
    { re: '\\bi am (go|eat|drink|work|study|come|play|read)\\b', hint: 'After "am / is / are" use the -ing form.', better: 'I am going / eating / working ...' },
    { re: '\\b(he|she|it) (go|eat|drink|work|like|have|want|study|live)\\b', hint: 'Add -s after he / she / it.', better: 'he goes / she eats / it works ...' },
    { re: '\\b(two|three|four|five|six|seven|eight|nine|ten) (book|friend|apple|brother|sister|bag|house|day)\\b', hint: 'After a number bigger than one, add -s to the noun.', better: 'two books / three friends ...' },
    { re: '\\bdoes (he|she|it) \\w+s\\b', hint: 'After "does" use the plain verb, without -s.', better: 'Does she like tea?' },
    { re: '\\bwhat you\\b', hint: 'Questions need a helper verb: do / does / are.', better: 'What do you ...?' },
    { re: '\\byesterday i (go|eat|come|see|have|do)\\b', hint: 'Use the past tense for yesterday.', better: 'Yesterday I went / ate / came / saw ...' },
    { re: '\\bi am agree\\b', hint: '"Agree" is a verb. Do not say "am".', better: 'I agree.' },
    { re: '\\bi (am )?(doctor|teacher|engineer|student|driver)\\b', hint: 'Add "a" before a job.', better: 'I am a teacher.' },
  ],
  closers: [{ t: 'Great talking with you! Keep practicing. Goodbye!', n: 'உங்களுடன் பேசியது மகிழ்ச்சி! தொடர்ந்து பயிற்சி செய்யுங்கள். வணக்கம்!' }],
};

export const SPANISH_TUTOR_FOR_ENGLISH: TutorKit = {
  openers: [{ t: '¡Hola! Soy Maya, tu profesora de español. ¿Cómo estás hoy?', n: 'Hello! I am Maya, your Spanish teacher. How are you today?' }],
  topics: [
    {
      keys: ['adios', 'hasta luego', 'chao', 'hasta manana', 'buenas noches'],
      replies: [{ t: '¡Adiós! Hablas muy bien. ¡Hasta pronto!', n: 'Goodbye! You speak very well. See you soon!' }],
    },
    {
      keys: ['hola', 'buenos dias', 'buenas tardes', 'buenas'],
      replies: [{ t: '¡Hola! Me alegra hablar contigo. ¿Cómo estás hoy?', n: 'Hello! I am happy to talk with you. How are you today?' }],
    },
    {
      keys: ['me llamo', 'mi nombre', 'soy'],
      replies: [{ t: '¡Mucho gusto! ¿De dónde eres?', n: 'Nice to meet you! Where are you from?' }],
    },
    {
      keys: ['bien', 'mal', 'cansado', 'cansada', 'contento', 'contenta', 'feliz', 'triste', 'regular', 'estoy'],
      replies: [
        { t: '¡Me alegro! ¿Qué hiciste hoy?', n: 'I am glad! What did you do today?' },
        { t: 'Entiendo. Cuéntame más sobre tu día.', n: 'I see. Tell me more about your day.' },
      ],
    },
    {
      keys: ['vivo', 'ciudad', 'pueblo', 'india', 'estados unidos', 'londres', 'vengo', 'pais'],
      replies: [{ t: '¡Qué interesante! Háblame de tu familia.', n: 'How interesting! Tell me about your family.' }],
    },
    {
      keys: ['madre', 'padre', 'hermano', 'hermana', 'familia', 'padres', 'esposa', 'esposo', 'hijo', 'hija'],
      replies: [
        { t: 'La familia es importante. ¿A qué se dedican?', n: 'Family is important. What do they do?' },
        { t: '¡Qué bonito! ¿Viven cerca de ti?', n: 'How nice! Do they live near you?' },
      ],
    },
    {
      keys: ['trabajo', 'oficina', 'estudiante', 'estudio', 'profesor', 'ingeniero', 'escuela', 'universidad', 'empresa'],
      replies: [
        { t: '¡Qué interesante! ¿Te gusta?', n: 'How interesting! Do you like it?' },
        { t: '¿Cuál es la mejor parte de tu día?', n: 'What is the best part of your day?' },
      ],
    },
    {
      keys: ['comida', 'como', 'arroz', 'cena', 'almuerzo', 'desayuno', 'hambre', 'bebo', 'cafe', 'pizza', 'tacos'],
      replies: [
        { t: '¡Qué rico! ¿Cuál es tu comida favorita?', n: 'Yum! What is your favorite food?' },
        { t: '¿Sabes cocinar? ¿Qué cocinas?', n: 'Can you cook? What do you cook?' },
      ],
    },
    {
      keys: ['me gusta', 'me encanta', 'musica', 'pelicula', 'peliculas', 'futbol', 'deporte', 'leer', 'bailar', 'juego', 'jugar'],
      replies: [
        { t: '¡Qué bien! ¿Con qué frecuencia lo haces?', n: 'Nice! How often do you do it?' },
        { t: 'Suena divertido. ¿Con quién lo haces?', n: 'Sounds fun. Who do you do it with?' },
      ],
    },
    {
      keys: ['tiempo', 'calor', 'lluvia', 'frio', 'sol', 'verano', 'invierno', 'llueve'],
      replies: [{ t: 'El tiempo cambia rápido. ¿Te gusta la lluvia?', n: 'The weather changes fast. Do you like the rain?' }],
    },
  ],
  fallbacks: [
    { t: 'Qué interesante. ¿Puedes contarme más?', n: 'How interesting. Can you tell me more?' },
    { t: '¿Puedes decirlo de otra manera?', n: 'Can you say it another way?' },
    { t: 'Quiero saber más. ¿Qué piensas?', n: 'I want to know more. What do you think?' },
  ],
  fixes: [
    { re: '\\byo es\\b', hint: 'With "yo" use "soy", not "es".', better: 'Yo soy ...' },
    { re: '\\bme llamo es\\b', hint: 'Say "Me llamo Ravi" with no "es".', better: 'Me llamo Ravi.' },
    { re: '\\b(yo )?(soy|es) (bien|mal|cansado|cansada|enfermo|enferma|feliz|triste)\\b', hint: 'Feelings use "estar": estoy bien, estoy cansado.', better: 'Estoy bien / Estoy cansado.' },
    { re: '\\byo (tiene|tienes|tenemos)\\b', hint: 'With "yo" use "tengo".', better: 'Yo tengo ...' },
    { re: '\\bun (casa|mesa|silla|leche|manzana|familia|hermana|madre)\\b', hint: 'This noun is feminine, so use "una".', better: 'una casa / una mesa ...' },
    { re: '\\buna (libro|amigo|hermano|padre|pan|arroz|vaso)\\b', hint: 'This noun is masculine, so use "un".', better: 'un libro / un amigo ...' },
    { re: '\\bgusto (el|la|los|las)\\b', hint: 'Say "me gusta" first: Me gusta el café.', better: 'Me gusta el café.' },
    { re: '\\bsoy (\\d+|diez|veinte|treinta) anos?\\b', hint: 'Age uses "tener": tengo diez años.', better: 'Tengo diez años.' },
    { re: '\\bhay (muy|mucho) (calor|frio)\\b', hint: 'Weather uses "hace": hace mucho calor.', better: 'Hace mucho calor.' },
  ],
  closers: [{ t: '¡Muy bien! Sigue practicando. ¡Adiós!', n: 'Very good! Keep practicing. Goodbye!' }],
};
