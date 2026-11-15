-- =============================================================================
-- 7.3 · "Enviar notificação de teste" (Especificação 2.9 parte 2; Arquitetura 3.10).
-- O barbeiro não pode criar notificações diretamente (RLS: só lê e marca como
-- lida). Esta função, só para o administrador, cria uma notificação do tipo
-- novo "test", que segue o caminho normal: lista do painel + push para todos
-- os aparelhos ativados. Fica na lista como as outras (apaga-se aos 30 dias).
-- =============================================================================
alter type public.notification_type add value if not exists 'test';

create function public.admin_send_test_notification()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_admin();
  return public.notify(
    'test'::public.notification_type,
    'Notificação de teste',
    'Se está a ler isto no telemóvel, as notificações estão a funcionar.',
    null);
end;
$$;

grant execute on function public.admin_send_test_notification() to authenticated;
