/**
 * Identidad criptográfica de nodo (DEC-0004, DEC-0030) — Ed25519 real vía
 * `did:key` (método W3C), usando el módulo `crypto` nativo de Node (soporta
 * Ed25519 desde Node 12+, sin dependencias nuevas). El identificador del
 * nodo (`providerId`) ES la clave pública codificada — no requiere un
 * directorio de claves separado ni distribución previa.
 */
import type { KeyObject } from "node:crypto";
export declare function base58Encode(bytes: Uint8Array): string;
export declare function base58Decode(str: string): Uint8Array;
/** Deriva un `did:key:z...` a partir de una clave pública Ed25519 cruda (32 bytes). */
export declare function publicKeyToDid(rawPublicKey: Uint8Array): string;
/** Decodifica un `did:key:z...` de vuelta a la clave pública Ed25519 cruda (32 bytes). */
export declare function didToPublicKeyRaw(did: string): Uint8Array;
export interface NodeIdentity {
    did: string;
    publicKey: KeyObject;
    privateKey: KeyObject;
    /** PEM de la clave privada, para persistir en disco entre reinicios. */
    privateKeyPem: string;
}
/** Genera una identidad Ed25519 nueva — llamar solo una vez por nodo y persistir `privateKeyPem`. */
export declare function generateIdentity(): NodeIdentity;
/** Reconstruye una identidad ya generada a partir de su clave privada persistida (PEM). */
export declare function loadIdentity(privateKeyPem: string): NodeIdentity;
/** Firma un payload (ej. `${providerId}:${timestamp}`) con la clave privada del nodo. */
export declare function signPayload(privateKey: KeyObject, payload: string): string;
/**
 * Verifica una firma contra el `did:key` que la reclama como autora — la
 * clave pública se deriva del propio `did`, no de un directorio separado.
 * Devuelve `false` (nunca lanza) ante cualquier `did`/firma malformados.
 */
export declare function verifySignature(did: string, payload: string, signatureBase64: string): boolean;
//# sourceMappingURL=identity.d.ts.map