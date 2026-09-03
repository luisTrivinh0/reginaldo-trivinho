# Reginaldo Trivinho — Landing Page Powered by Retorna

Primeira implementação do template de landing pages profissionais da Retorna.

## Arquitetura

- `public/`: site público e painel do titular
- `public/site.config.js`: identidade e contatos do cliente
- `public/data/services.json`: serviços iniciais e fallback
- `public/admin/`: painel para foto e serviços
- `netlify/functions/`: autenticação e persistência segura
- Netlify Blobs: usuários do cliente, sessões, foto e serviços alterados pelo painel

Não há banco de dados tradicional.

## Acesso Master Retorna

Cada site possui uma identidade Master da Retorna separada dos usuários do cliente.

A credencial Master é representada em `netlify/functions/_config/master.json` somente por:

- hash SHA-256 do e-mail;
- salt exclusivo deste projeto;
- hash `scrypt` da senha.

Nenhuma senha em texto puro ou Base64 é versionada no GitHub.

A conta Master:

- não é armazenada na lista de usuários do cliente;
- não aparece no painel do proprietário;
- não pode ser excluída, desativada ou alterada pelo cliente;
- não exige troca de senha no primeiro acesso;
- pode cadastrar o primeiro proprietário do site.

Nenhuma senha em texto puro ou Base64 é publicada.

## Primeiro proprietário

O Master acessa `/admin/` e cadastra o perfil do dono com e-mail e senha temporária.

Se ainda não houver proprietário ativo, o primeiro usuário criado pelo Master é automaticamente registrado como `owner`, independentemente da opção selecionada no formulário.

O proprietário será obrigado a trocar a senha temporária no primeiro login.

## Painel

Acesse `/admin/`.

O titular pode trocar a senha temporária, enviar ou substituir a foto e cadastrar, editar, ocultar ou excluir serviços.

### Usuários e permissões

Perfis disponíveis:

- `owner`: administra conteúdo, foto, serviços e usuários;
- `editor`: administra foto e serviços, sem acesso ao gerenciamento de usuários.

O proprietário pode cadastrar, editar, ativar, desativar, redefinir senha temporária e excluir outros usuários.

Proteções aplicadas:

- novos usuários devem trocar a senha temporária no primeiro login;
- desativar ou alterar o perfil invalida as sessões existentes;
- o proprietário não pode excluir ou remover o próprio acesso;
- o sistema sempre exige pelo menos um `owner` ativo;
- credenciais e hashes nunca são enviados pela API administrativa.

## Segurança

- credenciais iniciais armazenadas somente como hashes no backend;
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
- `backup/pre-multiuser-2026-09-03`
- `backup/pre-master-retorna-2026-09-03`
