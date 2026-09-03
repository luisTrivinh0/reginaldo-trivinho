# Reginaldo Trivinho — Landing Page Powered by Retorna

Primeira implementação do template de landing pages profissionais da Retorna.

## Arquitetura

- `public/`: site público e painel do titular
- `public/site.config.js`: identidade e contatos do cliente
- `public/data/services.json`: serviços iniciais e fallback
- `public/admin/`: painel para foto e serviços
- `netlify/functions/`: autenticação e persistência segura
- Netlify Blobs: conta, sessões, foto e serviços alterados pelo painel

Não há banco de dados tradicional.

## Primeiro acesso

Configure somente nas variáveis de ambiente da Netlify:

- `INITIAL_ADMIN_EMAIL`
- `INITIAL_ADMIN_PASSWORD`

Nenhuma credencial inicial deve ser adicionada ao GitHub, HTML ou JavaScript público.

No primeiro login, a conta é criada no Netlify Blobs com senha derivada por `scrypt` e o painel obriga a criação de uma nova senha.

## Painel

Acesse `/admin/`.

O titular pode trocar a senha temporária, enviar ou substituir a foto e cadastrar, editar, ocultar ou excluir serviços.

## Segurança

- credenciais iniciais apenas em variáveis de ambiente;
- senha nunca armazenada em texto puro;
- troca obrigatória no primeiro login;
- sessão server-side com cookie HttpOnly, Secure e SameSite=Strict;
- invalidação das sessões após troca de senha;
- limitação básica de tentativas por IP;
- verificação de origem em escrita;
- foto limitada a JPG, PNG ou WebP de até 4 MB;
- Functions fora da pasta publicada.

## Backups

- `backup/pre-retorna-template-2026-09-02`
- `backup-auth-blobs-2026-09-02`
