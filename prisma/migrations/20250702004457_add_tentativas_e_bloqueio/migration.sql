-- AlterTable
ALTER TABLE `usuarios` ADD COLUMN `bloqueado` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `tentativasInvalidas` INTEGER NOT NULL DEFAULT 0;
