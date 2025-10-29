import { format } from "date-fns";

interface MessageVariables {
  nome_cliente: string;
  nome_profissional: string;
  horario_agendamento: string;
  chave_pix?: string;
  valor: string;
  localizacao?: string;
}

export function replaceMessageVariables(
  template: string,
  variables: MessageVariables
): string {
  let message = template;
  message = message.replace(/{nome_cliente}/g, variables.nome_cliente);
  message = message.replace(/{nome_profissional}/g, variables.nome_profissional);
  message = message.replace(/{horario_agendamento}/g, variables.horario_agendamento);
  message = message.replace(/{chave_pix}/g, variables.chave_pix || "");
  message = message.replace(/{valor}/g, variables.valor);
  message = message.replace(/{localizacao}/g, variables.localizacao || "");
  return message;
}

export function createWhatsAppLink(phone: string, message: string): string {
  // Remove caracteres não numéricos do telefone
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Encode a mensagem para URL
  const encodedMessage = encodeURIComponent(message);
  
  // Retorna o link do WhatsApp
  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}
