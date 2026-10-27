import {
  ManagementRepository,
  managementRepository,
} from '../repositories/management.repository.js';
import {
  CollegeDto,
  CreateCollegeDto,
  UpdateCollegeDto,
  DepartmentDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CourseDto,
  CreateCourseDto,
  UpdateCourseDto,
  ClassDto,
  CreateClassDto,
  UpdateClassDto,
  SectionDto,
  CreateSectionDto,
  UpdateSectionDto,
  StudentDto,
  CreateStudentDto,
  UpdateStudentDto,
  StudentSkillDto,
  CreateStudentSkillDto,
  UpdateStudentSkillDto,
  StudentWithAccountDto,
  StudentQueryFilters,
  PaginatedResult,
  ExcelImportResult,
  ExcelImportRowError,
  ExcelImportCredential,
} from '../types/management.types.js';
import { AppError } from '../middleware/errorHandler.js';
import { parseStudentExcel } from '../utils/excel.util.js';
import { userRepository } from '../repositories/user.repository.js';
import { hashPassword } from '../utils/password.util.js';
import { Role } from '../types/auth.types.js';
import { StudentStatus } from '@prisma/client';

export class ManagementService {
  constructor(private readonly repo: ManagementRepository = managementRepository) {}

  // ===========================================================================
  // 1. COLLEGE
  // ===========================================================================
  async createCollege(dto: CreateCollegeDto): Promise<CollegeDto> {
    const existing = await this.repo.findCollegeByCode(dto.code);
    if (existing) {
      throw new AppError(`College with code "${dto.code.toUpperCase()}" already exists`, 409);
    }
    return this.repo.createCollege(dto);
  }

  async getColleges(): Promise<CollegeDto[]> {
    return this.repo.findColleges();
  }

  async getCollegeById(id: string): Promise<CollegeDto> {
    const college = await this.repo.findCollegeById(id);
    if (!college) throw new AppError('College not found', 404);
    return college;
  }

  async updateCollege(id: string, dto: UpdateCollegeDto): Promise<CollegeDto> {
    await this.getCollegeById(id);
    if (dto.code) {
      const trimmedCode = dto.code.trim().toUpperCase();
      if (!trimmedCode) {
        throw new AppError('College code cannot be empty', 400);
      }
      const existing = await this.repo.findCollegeByCode(trimmedCode);
      if (existing && existing.id !== id) {
        throw new AppError(`College with code "${trimmedCode}" already exists`, 409);
      }
      dto.code = trimmedCode;
    }
    const updated = await this.repo.updateCollege(id, dto);
    if (!updated) throw new AppError('Failed to update college', 500);
    return updated;
  }

  async deleteCollege(id: string): Promise<void> {
    await this.getCollegeById(id);
    await this.repo.deleteCollege(id);
  }

  // ===========================================================================
  // 2. DEPARTMENT
  // ===========================================================================
  async createDepartment(dto: CreateDepartmentDto): Promise<DepartmentDto> {
    const college = await this.repo.findCollegeById(dto.collegeId);
    if (!college) throw new AppError('Specified College not found', 404);

    const existingCode = await this.repo.findDepartmentByCode(dto.collegeId, dto.code);
    if (existingCode) {
      throw new AppError(`Department code "${dto.code.toUpperCase()}" already exists in this college`, 409);
    }

    const existingName = await this.repo.findDepartmentByName(dto.collegeId, dto.name);
    if (existingName) {
      throw new AppError(`Department name "${dto.name}" already exists in this college`, 409);
    }

    return this.repo.createDepartment(dto);
  }

  async getDepartments(collegeId?: string): Promise<DepartmentDto[]> {
    return this.repo.findDepartments(collegeId);
  }

  async getDepartmentById(id: string): Promise<DepartmentDto> {
    const dept = await this.repo.findDepartmentById(id);
    if (!dept) throw new AppError('Department not found', 404);
    return dept;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDto> {
    const dept = await this.getDepartmentById(id);
    if (dto.code) {
      const existing = await this.repo.findDepartmentByCode(dept.collegeId, dto.code);
      if (existing && existing.id !== id) {
        throw new AppError(`Department code "${dto.code.toUpperCase()}" already exists in this college`, 409);
      }
    }
    if (dto.name) {
      const existingName = await this.repo.findDepartmentByName(dept.collegeId, dto.name);
      if (existingName && existingName.id !== id) {
        throw new AppError(`Department name "${dto.name}" already exists in this college`, 409);
      }
    }
    const updated = await this.repo.updateDepartment(id, dto);
    if (!updated) throw new AppError('Failed to update department', 500);
    return updated;
  }

  async deleteDepartment(id: string): Promise<void> {
    const dept = await this.getDepartmentById(id);
    if ((dept._count?.courses ?? 0) > 0 || (dept._count?.students ?? 0) > 0) {
      throw new AppError(
        `Cannot delete department "${dept.name}" because it contains active courses or students. Please remove or reassign dependent records first.`,
        400
      );
    }
    await this.repo.deleteDepartment(id);
  }

  // ===========================================================================
  // 3. COURSE
  // ===========================================================================
  async createCourse(dto: CreateCourseDto): Promise<CourseDto> {
    const dept = await this.repo.findDepartmentById(dto.departmentId);
    if (!dept) throw new AppError('Specified Department not found', 404);

    const existingCode = await this.repo.findCourseByCode(dto.departmentId, dto.code);
    if (existingCode) {
      throw new AppError(`Course code "${dto.code.toUpperCase()}" already exists in this department`, 409);
    }

    const existingName = await this.repo.findCourseByName(dto.departmentId, dto.name);
    if (existingName) {
      throw new AppError(`Course name "${dto.name}" already exists in this department`, 409);
    }

    return this.repo.createCourse(dto);
  }

  async getCourses(departmentId?: string): Promise<CourseDto[]> {
    return this.repo.findCourses(departmentId);
  }

  async getCourseById(id: string): Promise<CourseDto> {
    const course = await this.repo.findCourseById(id);
    if (!course) throw new AppError('Course not found', 404);
    return course;
  }

  async updateCourse(id: string, dto: UpdateCourseDto): Promise<CourseDto> {
    const crs = await this.getCourseById(id);
    if (dto.code) {
      const existing = await this.repo.findCourseByCode(crs.departmentId, dto.code);
      if (existing && existing.id !== id) {
        throw new AppError(`Course code "${dto.code.toUpperCase()}" already exists in this department`, 409);
      }
    }
    if (dto.name) {
      const existingName = await this.repo.findCourseByName(crs.departmentId, dto.name);
      if (existingName && existingName.id !== id) {
        throw new AppError(`Course name "${dto.name}" already exists in this department`, 409);
      }
    }
    const updated = await this.repo.updateCourse(id, dto);
    if (!updated) throw new AppError('Failed to update course', 500);
    return updated;
  }

  async deleteCourse(id: string): Promise<void> {
    const crs = await this.getCourseById(id);
    if ((crs._count?.classes ?? 0) > 0 || (crs._count?.students ?? 0) > 0) {
      throw new AppError(
        `Cannot delete course "${crs.name}" because it contains active classes or students. Please remove or reassign dependent records first.`,
        400
      );
    }
    await this.repo.deleteCourse(id);
  }

  // ===========================================================================
  // 4. CLASS
  // ===========================================================================
  async createClass(dto: CreateClassDto): Promise<ClassDto> {
    const dept = await this.repo.findDepartmentById(dto.departmentId);
    if (!dept) throw new AppError('Specified Department not found', 404);

    const crs = await this.repo.findCourseById(dto.courseId);
    if (!crs) throw new AppError('Specified Course not found', 404);

    if (crs.departmentId !== dto.departmentId) {
      throw new AppError('Relational mismatch: Course does not belong to specified Department', 400);
    }

    const existing = await this.repo.findClassByBatchYear(dto.courseId, dto.batchYear, dto.currentYear);
    if (existing) {
      throw new AppError(
        `Class already exists for course "${crs.code}", batch ${dto.batchYear}, year ${dto.currentYear}`,
        409
      );
    }

    return this.repo.createClass(dto);
  }

  async getClasses(courseId?: string, departmentId?: string): Promise<ClassDto[]> {
    return this.repo.findClasses(courseId, departmentId);
  }

  async getClassById(id: string): Promise<ClassDto> {
    const cls = await this.repo.findClassById(id);
    if (!cls) throw new AppError('Class not found', 404);
    return cls;
  }

  async updateClass(id: string, dto: UpdateClassDto): Promise<ClassDto> {
    await this.getClassById(id);
    const updated = await this.repo.updateClass(id, dto);
    if (!updated) throw new AppError('Failed to update class', 500);
    return updated;
  }

  async deleteClass(id: string): Promise<void> {
    await this.getClassById(id);
    await this.repo.deleteClass(id);
  }

  // ===========================================================================
  // 5. SECTION
  // ===========================================================================
  async createSection(dto: CreateSectionDto): Promise<SectionDto> {
    const cls = await this.repo.findClassById(dto.classId);
    if (!cls) throw new AppError('Specified Class not found', 404);

    const existing = await this.repo.findSectionByName(dto.classId, dto.name);
    if (existing) {
      throw new AppError(`Section "${dto.name.toUpperCase()}" already exists in this class`, 409);
    }

    return this.repo.createSection(dto);
  }

  async getSections(classId?: string): Promise<SectionDto[]> {
    return this.repo.findSections(classId);
  }

  async getSectionById(id: string): Promise<SectionDto> {
    const sec = await this.repo.findSectionById(id);
    if (!sec) throw new AppError('Section not found', 404);
    return sec;
  }

  async updateSection(id: string, dto: UpdateSectionDto): Promise<SectionDto> {
    const sec = await this.getSectionById(id);
    if (dto.name) {
      const existing = await this.repo.findSectionByName(sec.classId, dto.name);
      if (existing && existing.id !== id) {
        throw new AppError(`Section "${dto.name.toUpperCase()}" already exists in this class`, 409);
      }
    }
    const updated = await this.repo.updateSection(id, dto);
    if (!updated) throw new AppError('Failed to update section', 500);
    return updated;
  }

  async deleteSection(id: string): Promise<void> {
    await this.getSectionById(id);
    await this.repo.deleteSection(id);
  }

  // ===========================================================================
  // 6. STUDENT CRUD
  // ===========================================================================
  async createStudent(dto: CreateStudentDto): Promise<StudentWithAccountDto> {
    // 1. Duplicate check (registerNumber & collegeEmail)
    const existingReg = await this.repo.findStudentByRegisterNumber(dto.registerNumber);
    if (existingReg) {
      throw new AppError(`Student with register number "${dto.registerNumber.toUpperCase()}" already exists`, 409);
    }

    const existingEmail = await this.repo.findStudentByEmail(dto.collegeEmail);
    if (existingEmail) {
      throw new AppError(`Student with email "${dto.collegeEmail.toLowerCase()}" already exists`, 409);
    }

    const existingUser = await userRepository.findByEmail(dto.collegeEmail);
    if (existingUser) {
      throw new AppError(`User account with email "${dto.collegeEmail.toLowerCase()}" already exists`, 409);
    }

    // 2. Hierarchy validation & auto-resolution
    let departmentId = dto.departmentId;
    let courseId = typeof dto.courseId === 'string' && dto.courseId.trim() ? dto.courseId : undefined;
    let classId = typeof dto.classId === 'string' && dto.classId.trim() ? dto.classId : undefined;
    let sectionId = typeof dto.sectionId === 'string' && dto.sectionId.trim() ? dto.sectionId : undefined;

    const dept = await this.repo.findDepartmentById(departmentId);
    if (!dept) throw new AppError('Specified Department does not exist', 404);

    courseId ||= (await this.repo.findCourses(departmentId))[0]?.id;
    if (courseId && !(await this.repo.findCourseById(courseId))) {
      throw new AppError('Specified Course does not exist', 404);
    }

    if (!classId && courseId) {
      classId = (await this.repo.findClasses(courseId, departmentId))[0]?.id;
    }
    if (classId && !(await this.repo.findClassById(classId))) {
      throw new AppError('Specified Class does not exist', 404);
    }

    if (!sectionId && classId) {
      sectionId = (await this.repo.findSections(classId))[0]?.id;
    }
    if (sectionId && !(await this.repo.findSectionById(sectionId))) {
      throw new AppError('Specified Section does not exist', 404);
    }

    // 3. Generate password or use provided password & create linked User account
    const customPassword = dto.password?.trim();
    const finalPassword = customPassword || 'Student@123';
    const passwordHash = await hashPassword(finalPassword);
    const user = await userRepository.createUser({
      email: dto.collegeEmail.trim().toLowerCase(),
      passwordHash,
      role: Role.STUDENT,
      isActive: true,
      mustChangePassword: customPassword ? false : true,
    });

    try {
      const student = await this.repo.createStudent({
        ...dto,
        departmentId,
        courseId: courseId ?? null,
        classId: classId ?? null,
        sectionId: sectionId ?? null,
        userId: user.id,
        status: dto.status || (customPassword ? StudentStatus.ACTIVE : StudentStatus.INACTIVE),
      });

      if (user.student) {
        user.student.id = student.id;
        user.student.status = student.status;
      }

      return {
        ...student,
        temporaryPassword: finalPassword,
      };
    } catch (err) {
      await userRepository.deleteUser(user.id);
      throw err;
    }
  }

  async resetStudentPassword(studentId: string): Promise<{ temporaryPassword: string; email: string }> {
    const student = await this.getStudentById(studentId);
    let user = student.userId
      ? await userRepository.findById(student.userId)
      : await userRepository.findByEmail(student.collegeEmail);

    const tempPassword = 'Student@123';
    const passwordHash = await hashPassword(tempPassword);

    if (!user) {
      user = await userRepository.createUser({
        email: student.collegeEmail,
        passwordHash,
        role: Role.STUDENT,
        isActive: true,
        mustChangePassword: true,
        student: {
          id: student.id,
          userId: '',
          registerNumber: student.registerNumber,
          department: student.department?.name || '',
          batchYear: student.class?.batchYear || 2026,
          cgpa: student.cgpa || null,
          status: StudentStatus.INACTIVE,
        },
      });
      await this.repo.updateStudent(student.id, { userId: user.id, status: StudentStatus.INACTIVE });
    } else {
      await userRepository.updatePassword(user.id, passwordHash);
      await userRepository.setMustChangePassword(user.id, true);
      await this.repo.updateStudent(student.id, { status: StudentStatus.INACTIVE });
    }

    return { temporaryPassword: tempPassword, email: student.collegeEmail };
  }

  async getStudents(filters: StudentQueryFilters): Promise<PaginatedResult<StudentDto>> {
    return this.repo.findStudents(filters);
  }

  async getStudentById(id: string): Promise<StudentDto> {
    const student = await this.repo.findStudentById(id);
    if (!student) throw new AppError('Student not found', 404);
    return student;
  }

  async updateStudent(id: string, dto: UpdateStudentDto): Promise<StudentDto> {
    const student = await this.getStudentById(id);

    // If changing department/course/class/section, validate consistency
    if (dto.departmentId && dto.courseId) {
      const crs = await this.repo.findCourseById(dto.courseId);
      if (!crs || crs.departmentId !== dto.departmentId) {
        throw new AppError('Hierarchy mismatch: Course does not belong to Department', 400);
      }
    }

    if (dto.password && dto.password.trim()) {
      const user = student.userId
        ? await userRepository.findById(student.userId)
        : await userRepository.findByEmail(student.collegeEmail);
      if (user) {
        const passwordHash = await hashPassword(dto.password.trim());
        await userRepository.updatePassword(user.id, passwordHash);
        await userRepository.setMustChangePassword(user.id, false);
      }
    }

    const updated = await this.repo.updateStudent(id, dto);
    if (!updated) throw new AppError('Failed to update student', 500);
    return updated;
  }

  async deleteStudent(id: string): Promise<void> {
    await this.getStudentById(id);
    await this.repo.deleteStudent(id);
  }

  // ===========================================================================
  // STUDENT SKILLS SERVICE
  // ===========================================================================
  async getStudentSkills(studentId: string): Promise<StudentSkillDto[]> {
    await this.getStudentById(studentId);
    return this.repo.findStudentSkills(studentId);
  }

  async addStudentSkill(studentId: string, dto: CreateStudentSkillDto): Promise<StudentSkillDto> {
    if (!dto.name || !dto.name.trim()) {
      throw new AppError('Skill name is required', 400);
    }
    await this.getStudentById(studentId);
    return this.repo.createStudentSkill(studentId, dto);
  }

  async updateStudentSkill(
    studentId: string,
    skillId: string,
    dto: UpdateStudentSkillDto
  ): Promise<StudentSkillDto> {
    await this.getStudentById(studentId);
    return this.repo.updateStudentSkill(studentId, skillId, dto);
  }

  async removeStudentSkill(studentId: string, skillId: string): Promise<boolean> {
    await this.getStudentById(studentId);
    return this.repo.deleteStudentSkill(studentId, skillId);
  }

  // ===========================================================================
  // 7. EXCEL BULK IMPORT
  // ===========================================================================
  async importStudentsFromExcel(buffer: Buffer): Promise<ExcelImportResult> {
    const { rows, parseErrors } = parseStudentExcel(buffer);
    const errors: ExcelImportRowError[] = [...parseErrors];

    const seenRegisterNumbers = new Set<string>();
    const seenEmails = new Set<string>();

    // Cache departments, courses, classes, sections for fast lookup
    const allDepts = await this.repo.findDepartments();
    const allCourses = await this.repo.findCourses();
    const allClasses = await this.repo.findClasses();
    const allSections = await this.repo.findSections();

    const validStudentsToInsert: CreateStudentDto[] = [];
    const createdCredentials: ExcelImportCredential[] = [];
    let duplicateCount = 0;

    for (const row of rows) {
      const regUpper = row.registerNumber.toUpperCase();
      const emailLower = row.collegeEmail.toLowerCase();

      // 1. In-file duplicate check
      if (seenRegisterNumbers.has(regUpper)) {
        duplicateCount++;
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'Register Number',
          message: `Duplicate register number "${regUpper}" found within file`,
        });
        continue;
      }
      if (seenEmails.has(emailLower)) {
        duplicateCount++;
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'College Email',
          message: `Duplicate email "${emailLower}" found within file`,
        });
        continue;
      }

      seenRegisterNumbers.add(regUpper);
      seenEmails.add(emailLower);

      // 2. Database duplicate check
      const existingStudent = await this.repo.findStudentByRegisterNumber(regUpper);
      if (existingStudent) {
        duplicateCount++;
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'Register Number',
          message: `Register number "${regUpper}" already exists in database`,
        });
        continue;
      }

      const existingEmail = await this.repo.findStudentByEmail(emailLower);
      if (existingEmail) {
        duplicateCount++;
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'College Email',
          message: `Email "${emailLower}" already exists in database`,
        });
        continue;
      }

      const existingUser = await userRepository.findByEmail(emailLower);
      if (existingUser) {
        duplicateCount++;
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'College Email',
          message: `User account with email "${emailLower}" already exists`,
        });
        continue;
      }

      // 3. Resolve Department
      const dept = allDepts.find((d) => d.code === row.departmentCode);
      if (!dept) {
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'Department',
          message: `Department code "${row.departmentCode}" not found`,
        });
        continue;
      }

      // 4. Resolve Course
      const crs = allCourses.find((c) => c.code === row.courseCode && c.departmentId === dept.id);
      if (!crs) {
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'Course',
          message: `Course code "${row.courseCode}" not found under department "${dept.code}"`,
        });
        continue;
      }

      // 5. Resolve Class
      const cls = allClasses.find(
        (cl) => cl.courseId === crs.id && cl.departmentId === dept.id && cl.currentYear === row.year
      );
      if (!cls) {
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'Year/Class',
          message: `No class found for course "${crs.code}" and year ${row.year}`,
        });
        continue;
      }

      // 6. Resolve Section
      const sec = allSections.find((s) => s.classId === cls.id && s.name === row.sectionName);
      if (!sec) {
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'Section',
          message: `Section "${row.sectionName}" not found in class "${cls.name}"`,
        });
        continue;
      }

      // 7. CGPA validation if provided
      if (row.cgpa !== undefined && (row.cgpa < 0 || row.cgpa > 10)) {
        errors.push({
          row: row.rowNumber,
          registerNumber: regUpper,
          field: 'CGPA',
          message: `CGPA ${row.cgpa} must be between 0.00 and 10.00`,
        });
        continue;
      }

      // Create linked user account for imported student
      const tempPassword = 'Student@123';
      const passwordHash = await hashPassword(tempPassword);
      const user = await userRepository.createUser({
        email: emailLower,
        passwordHash,
        role: Role.STUDENT,
        isActive: true,
        mustChangePassword: true,
      });

      validStudentsToInsert.push({
        userId: user.id,
        registerNumber: regUpper,
        name: row.name,
        collegeEmail: emailLower,
        phone: row.phone,
        departmentId: dept.id,
        courseId: crs.id,
        classId: cls.id,
        sectionId: sec.id,
        year: row.year,
        cgpa: row.cgpa ?? row.ugCgpa,
        status: StudentStatus.INACTIVE,
        tenthObtainedMarks: row.tenthObtainedMarks,
        tenthTotalMarks: row.tenthTotalMarks,
        tenthPercentage: row.tenthPercentage,
        twelfthObtainedMarks: row.twelfthObtainedMarks,
        twelfthTotalMarks: row.twelfthTotalMarks,
        twelfthPercentage: row.twelfthPercentage,
        ugDegree: row.ugDegree || crs.name,
        ugStatus: row.ugStatus || 'STUDYING',
        ugCgpa: row.ugCgpa ?? row.cgpa,
        ugPercentage: row.ugPercentage,
        pgDegree: row.pgDegree,
        pgStatus: row.pgStatus,
        pgCgpa: row.pgCgpa,
        pgPercentage: row.pgPercentage,
      });

      createdCredentials.push({
        registerNumber: regUpper,
        name: row.name,
        email: emailLower,
        temporaryPassword: tempPassword,
      });
    }

    // Atomic insertion of all valid records
    let importedCount = 0;
    if (validStudentsToInsert.length > 0) {
      importedCount = await this.repo.bulkCreateStudents(validStudentsToInsert);
    }

    return {
      importedCount,
      failedCount: errors.length,
      duplicateCount,
      errors,
      credentials: createdCredentials,
    };
  }
}

export const managementService = new ManagementService();
