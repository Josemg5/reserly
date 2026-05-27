import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window as unknown as Window);

export function sanitizeInput(input: string | null | undefined): string {
    if (!input) return '';
    return purify.sanitize(input, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: []
    }).trim();
}
