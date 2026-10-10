import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { logger } from '../utils/logger';
import { I18nValidationException, I18nService } from 'nestjs-i18n';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly i18n: I18nService) { }

  private resolveLang(request: any): string {
    let rawLang =
      request.headers?.['x-custom-lang'] ||
      request.headers?.['x-lang'] ||
      request.headers?.['lang'] ||
      request.query?.lang ||
      request.headers?.['accept-language'] ||
      'tk';

    if (typeof rawLang === 'string') {
      rawLang = rawLang.toLowerCase();
      if (rawLang.includes('ru')) return 'ru';
      if (rawLang.includes('en')) return 'en';
      if (rawLang.includes('tk')) return 'tk';
    }
    return 'tk';
  }

  private formatConstraintMessage(
    property: string,
    constraintKey: string,
    rawMessage: string,
    lang: string,
  ): string {
    const cleanProp = property || 'Meýdança';

    const digits = rawMessage ? rawMessage.match(/\d+/g) || [] : [];
    const firstNum = digits[0] || '';
    const secondNum = digits[1] || '';

    if (constraintKey) {
      let template = String(this.i18n.t(`validation.${constraintKey}`, { lang }) || '');
      if (!template || template === `validation.${constraintKey}`) {
        template = String(this.i18n.t(`validation.${constraintKey.toUpperCase()}`, { lang }) || '');
      }

      if (template && typeof template === 'string' && !template.startsWith('validation.')) {
        let result = template;
        result = result.replace(/\{property\}/g, cleanProp);
        result = result.replace(/\{constraints\.0\}/g, firstNum);
        result = result.replace(/\{constraints\.1\}/g, secondNum);
        result = result.replace(/\{0\}/g, firstNum);
        result = result.replace(/\{1\}/g, secondNum);
        return result;
      }
    }

    if (rawMessage && typeof rawMessage === 'string') {
      if (rawMessage.includes('must be longer than or equal to')) {
        const min = firstNum;
        if (lang === 'tk') return `${cleanProp} iň az ${min} simwoldan ybarat bolmaly.`;
        if (lang === 'ru') return `${cleanProp} должно быть не менее ${min} символов.`;
        return `${cleanProp} must be at least ${min} characters.`;
      }
      if (rawMessage.includes('must be shorter than or equal to')) {
        const max = firstNum;
        if (lang === 'tk') return `${cleanProp} iň köp ${max} simwol bolup biler.`;
        if (lang === 'ru') return `${cleanProp} может быть не более ${max} символов.`;
        return `${cleanProp} must be at most ${max} characters.`;
      }
      if (rawMessage.includes('should not be empty')) {
        if (lang === 'tk') return `${cleanProp} hökmany doldurylmaly.`;
        if (lang === 'ru') return `${cleanProp} обязательно для заполнения.`;
        return `${cleanProp} is required.`;
      }
      if (rawMessage.includes('must be a string')) {
        if (lang === 'tk') return `${cleanProp} diňe tekst görnüşinde bolmaly.`;
        if (lang === 'ru') return `${cleanProp} должно быть текстовым значением.`;
        return `${cleanProp} must be a text string.`;
      }
      if (rawMessage.includes('must be a number')) {
        if (lang === 'tk') return `${cleanProp} diňe san bolmaly.`;
        if (lang === 'ru') return `${cleanProp} должно быть числом.`;
        return `${cleanProp} must be a number.`;
      }
    }

    if (lang === 'tk') return `${cleanProp} meýdançasynda ýalňyşlyk bar.`;
    if (lang === 'ru') return `Ошибка в поле ${cleanProp}.`;
    return `Invalid value for field ${cleanProp}.`;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const lang = this.resolveLang(request);
    let status = HttpStatus.INTERNAL_SERVER_ERROR;

    if (exception instanceof I18nValidationException) {
      const errors = (exception as any).errors || [];
      const messages: string[] = [];

      for (const err of errors) {
        const prop = err.property || '';
        if (err.constraints) {
          for (const [key, msg] of Object.entries(err.constraints)) {
            const formatted = this.formatConstraintMessage(prop, key, String(msg), lang);
            messages.push(formatted);
          }
        }
      }

      const finalMsg = messages.join('; ') || this.i18n.t('validation.validationFailed', { lang });

      return response.status(HttpStatus.BAD_REQUEST).json({
        status: HttpStatus.BAD_REQUEST,
        message: finalMsg,
        data: null,
      });
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res: any = exception.getResponse();

      let translatedMessage = '';
      if (status === HttpStatus.UNAUTHORIZED) {
        translatedMessage = String(this.i18n.t('common.unauthorized', { lang }) || '');
      } else if (status === HttpStatus.FORBIDDEN) {
        translatedMessage = String(this.i18n.t('common.forbidden', { lang }) || '');
      } else if (status === HttpStatus.NOT_FOUND) {
        if (typeof res === 'object' && res?.message && typeof res.message === 'string' && res.message.includes('.')) {
          const t = String(this.i18n.t(res.message, { lang }) || '');
          if (t && t !== res.message) {
            translatedMessage = t;
          }
        }
        if (!translatedMessage) {
          translatedMessage = String(this.i18n.t('common.notFound', { lang }) || '');
        }
      } else if (status === HttpStatus.BAD_REQUEST) {
        if (res && typeof res === 'object' && res.message) {
          const rawMsgs = Array.isArray(res.message) ? res.message : [res.message];
          const parsedMsgs = rawMsgs.map((m: string) => {
            if (typeof m === 'string') {
              if (m.includes('.')) {
                const t = String(this.i18n.t(m, { lang }) || '');
                if (t && t !== m) return t;
              }
              const parts = m.split(' ');
              const fieldName = parts[0] || '';
              return this.formatConstraintMessage(fieldName, '', m, lang);
            }
            return String(m);
          });
          translatedMessage = parsedMsgs.join('; ');
        } else {
          translatedMessage = String(this.i18n.t('common.badRequest', { lang }) || '');
        }
      } else if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        translatedMessage = String(this.i18n.t('common.serverError', { lang }) || '');
      }

      const finalMessage =
        translatedMessage ||
        (typeof res === 'string' ? res : res?.message) ||
        this.i18n.t('common.serverError', { lang });

      return response.status(status).json({
        status: status,
        message: finalMessage,
        data: null,
      });
    } else if (exception && typeof exception === 'object' && 'status' in exception) {
      status = Number(exception['status']) || HttpStatus.INTERNAL_SERVER_ERROR;
    }

    let errorMessage: any;
    if (exception instanceof Error) {
      errorMessage = exception.stack || exception.message;
    } else {
      errorMessage = exception;
    }

    if (status >= HttpStatus.BAD_REQUEST) {
      logger.error(`Server Error [${request.method}] ${request.url} - Status: ${status}`, {
        status,
        path: request.url,
        method: request.method,
        error: errorMessage,
      });
    }

    const fallbackMessage = this.i18n.t('common.serverError', { lang });

    response.status(status).json({
      status: status,
      message: fallbackMessage,
      data: null,
    });
  }
}