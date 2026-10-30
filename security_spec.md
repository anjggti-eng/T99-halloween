# Security Spec - T99 HALLOWEEN Votação da Melhor Fantasia

## 1. Data Invariants
- **Public Voting Integrity:** Qualquer usuário no navegador do seu PC pode ler candidatos e enviar 1 voto por máquina (`deviceId`).
- **One Vote per PC:** O ID do documento na coleção `/votes` é estritamente baseado no `deviceId` único (`vote_${deviceId}`). Uma tentativa de votar novamente com o mesmo PC sobrescreverá ou será bloqueada pelo sistema.
- **Candidate Limits:** Candidatos possuem até 2 fotos (`photos.size() <= 2`).
- **Vote Counter Integrity:** A votação incrementa o contador do candidato e registra o documento de voto do PC.
- **Admin Control:** Área administrativa oculta com credencial / chave mestre permite resetar contagens e cadastrar/remover candidatos.

## 2. The "Dirty Dozen" Payloads (Attacks Prevented)
1. **Ghost Field Candidate Injection:** Tentativa de injetar campos maliciosos não permitidos em candidatos.
2. **Infinite Photos Attack:** Tentativa de enviar array com 20 imagens pesadas (máximo permitido é 2 fotos).
3. **Negative Vote Exploit:** Tentar atualizar `votes` para valores negativos para sabotar competidores.
4. **ID Poisoning Attack:** Tentar usar IDs com caracteres maliciosos ou strings gigantescas (> 128 chars).
5. **Vote Flooding Bypass:** Tentar burlar a unicidade de voto por PC enviando IDs vazios ou falsificados.
6. **Cost Denial Attack:** Upload de strings desproporcionais nos campos de descrição ou nome de fantasia.
7. **Admin Privilege Escalation:** Tentar apagar todas as coleções sem chave administrativa válida.
8. **Blind Blanket Query Scraping:** Tentar varrer dados confidenciais.
9. **Candidate Hijacking:** Tentar mudar o ID original de um candidato existente.
10. **Corrupted Vote Payload:** Tentar registrar voto sem `candidateId` ou `deviceId`.
11. **Malicious Script in Costume Name:** Tentativa de injeção XSS sanitizada antes de renderizar.
12. **Double Vote Replay:** Reenvio simultâneo bloqueado pela chave primária única `vote_${deviceId}`.
