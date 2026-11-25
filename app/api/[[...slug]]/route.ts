import { NextResponse } from 'next/server';
import { POST as loyaltyBroadcastPost } from '@/app/api/_handlers/loyalty/broadcast';
import { GET as posOtaGet } from '@/app/api/_handlers/pos/ota';
import { POST as printCreatePost } from '@/app/api/_handlers/print/create';
import { GET as printHistoryGet } from '@/app/api/_handlers/print/history';
import { GET as printJobsPendingGet } from '@/app/api/_handlers/print/jobs-pending';
import { PATCH as printJobPatch } from '@/app/api/_handlers/print/job-by-id';
import { POST as pushNotifyKasbonPost } from '@/app/api/_handlers/push/notify-kasbon';
import { POST as pushNotifyPosAuthPost } from '@/app/api/_handlers/push/notify-pos-auth';
import { POST as pushNotifyPulangAwalPost } from '@/app/api/_handlers/push/notify-pulang-awal';
import { POST as pushNotifyReminderPost } from '@/app/api/_handlers/push/notify-reminder';
import { POST as pushNotifyWaStatusPost } from '@/app/api/_handlers/push/notify-wa-status';
import { POST as pushSubscribePost } from '@/app/api/_handlers/push/subscribe';
import { POST as pushTestPost } from '@/app/api/_handlers/push/test';
import { POST as pushUnsubscribePost } from '@/app/api/_handlers/push/unsubscribe';
import { GET as templatesGet, POST as templatesPost } from '@/app/api/_handlers/templates/index';
import { PUT as templatePut, DELETE as templateDelete } from '@/app/api/_handlers/templates/by-id';
import { POST as usersPost } from '@/app/api/_handlers/users/index';
import { PATCH as userPatch, DELETE as userDelete } from '@/app/api/_handlers/users/by-id';
import { PATCH as userPasswordPatch } from '@/app/api/_handlers/users/password';
import { GET as waOutboxGet, PATCH as waOutboxPatch } from '@/app/api/_handlers/wa-bridge/outbox';
import { POST as waStatusPost } from '@/app/api/_handlers/wa-bridge/status';

export const dynamic = 'force-dynamic';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type CatchAllContext = { params: Promise<{ slug?: string[] }> };
type StaticHandler = (request: Request) => Promise<Response>;
type IdHandler = (
  request: Request,
  context: { params: Promise<{ id: string }> },
) => Promise<Response>;

type StaticMethodMap = Partial<Record<HttpMethod, StaticHandler>>;
type IdMethodMap = Partial<Record<HttpMethod, IdHandler>>;

const STATIC_ROUTES: Record<string, StaticMethodMap> = {
  'loyalty/broadcast': { POST: loyaltyBroadcastPost },
  'pos/ota': { GET: posOtaGet },
  print: { POST: printCreatePost },
  'print/history': { GET: printHistoryGet },
  'print/jobs/pending': { GET: printJobsPendingGet },
  'push/notify-kasbon': { POST: pushNotifyKasbonPost },
  'push/notify-pos-auth': { POST: pushNotifyPosAuthPost },
  'push/notify-pulang-awal': { POST: pushNotifyPulangAwalPost },
  'push/notify-reminder': { POST: pushNotifyReminderPost },
  'push/notify-wa-status': { POST: pushNotifyWaStatusPost },
  'push/subscribe': { POST: pushSubscribePost },
  'push/test': { POST: pushTestPost },
  'push/unsubscribe': { POST: pushUnsubscribePost },
  templates: { GET: templatesGet, POST: templatesPost },
  users: { POST: usersPost },
  'wa-bridge/outbox': { GET: waOutboxGet, PATCH: waOutboxPatch },
  'wa-bridge/status': { POST: waStatusPost },
};

function resolveDynamicRoute(slug: string[]): { handlers: IdMethodMap; id: string } | null {
  if (slug.length === 3 && slug[0] === 'print' && slug[1] === 'jobs') {
    return { handlers: { PATCH: printJobPatch }, id: slug[2] };
  }
  if (slug.length === 2 && slug[0] === 'templates') {
    return { handlers: { PUT: templatePut, DELETE: templateDelete }, id: slug[1] };
  }
  if (slug.length === 2 && slug[0] === 'users') {
    return { handlers: { PATCH: userPatch, DELETE: userDelete }, id: slug[1] };
  }
  if (slug.length === 3 && slug[0] === 'users' && slug[2] === 'password') {
    return { handlers: { PATCH: userPasswordPatch }, id: slug[1] };
  }
  return null;
}

function methodNotAllowed(allowedMethods: string[]): Response {
  return NextResponse.json(
    { error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: allowedMethods.join(', ') } },
  );
}

async function dispatch(
  request: Request,
  context: CatchAllContext,
  method: HttpMethod,
): Promise<Response> {
  const slug = (await context.params).slug ?? [];
  if (slug.length === 0) {
    return NextResponse.json({ error: 'Not Found' }, { status: 404 });
  }

  // Cocokkan route statis lebih dulu agar path seperti /api/print/jobs/pending tidak tertangkap [id]
  const staticHandlers = STATIC_ROUTES[slug.join('/')];
  if (staticHandlers) {
    const handler = staticHandlers[method];
    return handler ? handler(request) : methodNotAllowed(Object.keys(staticHandlers));
  }

  const dynamicMatch = resolveDynamicRoute(slug);
  if (dynamicMatch) {
    const handler = dynamicMatch.handlers[method];
    return handler
      ? handler(request, { params: Promise.resolve({ id: dynamicMatch.id }) })
      : methodNotAllowed(Object.keys(dynamicMatch.handlers));
  }

  return NextResponse.json({ error: 'Not Found' }, { status: 404 });
}

/**
 * Dispatcher tunggal untuk seluruh endpoint /api/* non-export agar seluruh
 * operasi API berjalan dalam satu Vercel Function tanpa mengubah URL endpoint.
 */
export async function GET(request: Request, context: CatchAllContext): Promise<Response> {
  return dispatch(request, context, 'GET');
}

export async function POST(request: Request, context: CatchAllContext): Promise<Response> {
  return dispatch(request, context, 'POST');
}

export async function PUT(request: Request, context: CatchAllContext): Promise<Response> {
  return dispatch(request, context, 'PUT');
}

export async function PATCH(request: Request, context: CatchAllContext): Promise<Response> {
  return dispatch(request, context, 'PATCH');
}

export async function DELETE(request: Request, context: CatchAllContext): Promise<Response> {
  return dispatch(request, context, 'DELETE');
}
