/**
 * MedIA Suite — App-wide Constants
 * @module src/config/constants
 */

/** Queue attention deadlines in minutes per triage category. */
export const COLA_DEADLINE={ROJO:15,AMARILLO:30,VERDE:120};

/** Inactivity auto-logout threshold (ms). */
export const INACT_MS=20*60*1000;

/** Warning shown before auto-logout (ms). */
export const WARN_MS=18*60*1000;
