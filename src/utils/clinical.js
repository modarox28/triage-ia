/**
 * MedAI Suite — Clinical Threshold Utilities
 * Vital-sign severity classifiers. Pure functions, no side effects.
 * @module src/utils/clinical
 */

export function chkPA(s){s=parseFloat(s);return s<90||s>180?"critical":s<100||s>150?"warning":"normal";}
export function chkFC(f){f=parseFloat(f);return f<50||f>130?"critical":f<60||f>100?"warning":"normal";}
export function chkSat(s){s=parseFloat(s);return s<90?"critical":s<95?"warning":"normal";}
export function chkT(t){t=parseFloat(t);return t>40||t<35?"critical":t>38.5||t<36?"warning":"normal";}
export function chkFR(f){f=parseFloat(f);return f<8||f>30?"critical":f<12||f>24?"warning":"normal";}
