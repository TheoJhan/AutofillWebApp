module.exports = {
  // Basic obfuscation settings
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  debugProtection: false,
  debugProtectionInterval: 0,
  disableConsoleOutput: true,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: true,
  renameGlobals: false,
  selfDefending: true,
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.75,
  transformObjectKeys: true,
  unicodeEscapeSequence: false,
  
  // Advanced settings for better obfuscation
  rotateStringArray: true,
  shuffleStringArray: true,
  stringArrayWrappersCount: 2,
  stringArrayWrappersChainedCalls: true,
  stringArrayWrappersParametersMaxCount: 4,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.75,
  
  // Identifier obfuscation
  identifierNamesGenerator: 'hexadecimal',
  identifiersPrefix: '_',
  
  // Control flow obfuscation
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.75,
  
  // Dead code injection
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.4,
  
  // Self-defending code
  selfDefending: true,
  
  // Domain lock (optional - uncomment and set your domain)
  // domainLock: ['yourdomain.com'],
  
  // Reserved strings (keep important strings readable)
  reservedStrings: [
    'firebase',
    'auth',
    'firestore',
    'config',
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ],
  
  // Reserved names (keep important function/class names)
  reservedNames: [
    'firebase',
    'auth',
    'firestore',
    'config',
    'initializeApp',
    'getAuth',
    'getFirestore',
    'signInWithEmailAndPassword',
    'createUserWithEmailAndPassword',
    'signOut',
    'onAuthStateChanged'
  ]
}; 