/*
  Warnings:

  - Made the column `email` on table `alunos` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `alunos` MODIFY `email` VARCHAR(191) NOT NULL;
