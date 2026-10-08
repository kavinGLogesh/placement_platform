import { prisma } from '../config/prisma.config.js';
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
  StudentQueryFilters,
  PaginatedResult,
  StudentStatus,
} from '../types/management.types.js';

// =============================================================================
// In-Memory Fallback Data Store (for 100% reliable isolated tests / offline)
// =============================================================================

export class InMemoryManagementStore {
  public colleges: Map<string, CollegeDto> = new Map();
  public departments: Map<string, DepartmentDto> = new Map();
  public courses: Map<string, CourseDto> = new Map();
  public classes: Map<string, ClassDto> = new Map();
  public sections: Map<string, SectionDto> = new Map();
  public students: Map<string, StudentDto> = new Map();
  private initialized = false;

  initialize(): void {
    if (this.initialized) return;

    // Default College
    const college: CollegeDto = {
      id: 'col-001',
      code: 'KEC',
      name: 'Kongu Engineering College',
      address: 'Perundurai, Erode, Tamil Nadu 638060',
      website: 'https://kongu.ac.in',
      contactEmail: 'principal@kongu.ac.in',
      contactPhone: '04294-226555',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { departments: 2 },
    };
    this.colleges.set(college.id, college);

    // Default Department (CSE)
    const deptCSE: DepartmentDto = {
      id: 'dept-001',
      collegeId: 'col-001',
      code: 'CSE',
      name: 'Computer Science and Engineering',
      createdAt: new Date(),
      updatedAt: new Date(),
      college: { id: college.id, code: college.code, name: college.name },
      _count: { courses: 1, classes: 1, students: 2 },
    };
    this.departments.set(deptCSE.id, deptCSE);

    // Default Department (ECE)
    const deptECE: DepartmentDto = {
      id: 'dept-002',
      collegeId: 'col-001',
      code: 'ECE',
      name: 'Electronics and Communication Engineering',
      createdAt: new Date(),
      updatedAt: new Date(),
      college: { id: college.id, code: college.code, name: college.name },
      _count: { courses: 1, classes: 1, students: 1 },
    };
    this.departments.set(deptECE.id, deptECE);

    // Default Course (BTECH-CSE)
    const courseCSE: CourseDto = {
      id: 'crs-001',
      departmentId: 'dept-001',
      code: 'BTECH-CSE',
      name: 'B.Tech in Computer Science and Engineering',
      durationYears: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      department: { id: deptCSE.id, code: deptCSE.code, name: deptCSE.name },
      _count: { classes: 1, students: 2 },
    };
    this.courses.set(courseCSE.id, courseCSE);

    // Default Course (BE-ECE)
    const courseECE: CourseDto = {
      id: 'crs-002',
      departmentId: 'dept-002',
      code: 'BE-ECE',
      name: 'B.E. in Electronics and Communication Engineering',
      durationYears: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      department: { id: deptECE.id, code: deptECE.code, name: deptECE.name },
      _count: { classes: 1, students: 1 },
    };
    this.courses.set(courseECE.id, courseECE);

    // Default Class (CSE Year 3)
    const classCSE: ClassDto = {
      id: 'cls-001',
      departmentId: 'dept-001',
      courseId: 'crs-001',
      batchYear: 2026,
      currentYear: 3,
      name: 'CSE 2022-2026 - Year 3',
      createdAt: new Date(),
      updatedAt: new Date(),
      department: { id: deptCSE.id, code: deptCSE.code, name: deptCSE.name },
      course: { id: courseCSE.id, code: courseCSE.code, name: courseCSE.name },
      _count: { sections: 2, students: 2 },
    };
    this.classes.set(classCSE.id, classCSE);

    // Default Class (ECE Year 3)
    const classECE: ClassDto = {
      id: 'cls-002',
      departmentId: 'dept-002',
      courseId: 'crs-002',
      batchYear: 2026,
      currentYear: 3,
      name: 'ECE 2022-2026 - Year 3',
      createdAt: new Date(),
      updatedAt: new Date(),
      department: { id: deptECE.id, code: deptECE.code, name: deptECE.name },
      course: { id: courseECE.id, code: courseECE.code, name: courseECE.name },
      _count: { sections: 1, students: 1 },
    };
    this.classes.set(classECE.id, classECE);

    // Default Sections
    const secA: SectionDto = {
      id: 'sec-001',
      classId: 'cls-001',
      name: 'A',
      createdAt: new Date(),
      updatedAt: new Date(),
      class: {
        id: classCSE.id,
        name: classCSE.name,
        batchYear: classCSE.batchYear,
        currentYear: classCSE.currentYear,
        course: { id: courseCSE.id, code: courseCSE.code, name: courseCSE.name },
      },
      _count: { students: 1 },
    };
    const secB: SectionDto = {
      id: 'sec-002',
      classId: 'cls-001',
      name: 'B',
      createdAt: new Date(),
      updatedAt: new Date(),
      class: {
        id: classCSE.id,
        name: classCSE.name,
        batchYear: classCSE.batchYear,
        currentYear: classCSE.currentYear,
        course: { id: courseCSE.id, code: courseCSE.code, name: courseCSE.name },
      },
      _count: { students: 1 },
    };
    this.sections.set(secA.id, secA);
    this.sections.set(secB.id, secB);

    // Default Students
    const stu1: StudentDto = {
      id: 'stu-001',
      userId: 'usr-student-001',
      registerNumber: '2026CS101',
      name: 'Aarav Sharma',
      collegeEmail: 'student@placement.edu',
      phone: '9876543210',
      departmentId: 'dept-001',
      courseId: 'crs-001',
      classId: 'cls-001',
      sectionId: 'sec-001',
      year: 3,
      cgpa: 8.92,
      status: StudentStatus.ACTIVE,
      createdAt: new Date('2026-01-10T10:00:00Z'),
      updatedAt: new Date(),
      department: { id: deptCSE.id, code: deptCSE.code, name: deptCSE.name },
      course: { id: courseCSE.id, code: courseCSE.code, name: courseCSE.name },
      class: { id: classCSE.id, name: classCSE.name, batchYear: 2026, currentYear: 3 },
      section: { id: secA.id, name: secA.name },
    };
    const stu2: StudentDto = {
      id: 'stu-002',
      userId: null,
      registerNumber: '2026CS102',
      name: 'Bhavna Menon',
      collegeEmail: 'bhavna.cs26@placement.edu',
      phone: '9876543211',
      departmentId: 'dept-001',
      courseId: 'crs-001',
      classId: 'cls-001',
      sectionId: 'sec-002',
      year: 3,
      cgpa: 9.35,
      status: StudentStatus.ACTIVE,
      createdAt: new Date('2026-01-11T10:00:00Z'),
      updatedAt: new Date(),
      department: { id: deptCSE.id, code: deptCSE.code, name: deptCSE.name },
      course: { id: courseCSE.id, code: courseCSE.code, name: courseCSE.name },
      class: { id: classCSE.id, name: classCSE.name, batchYear: 2026, currentYear: 3 },
      section: { id: secB.id, name: secB.name },
    };
    this.students.set(stu1.id, stu1);
    this.students.set(stu2.id, stu2);

    this.initialized = true;
  }
}

export class ManagementRepository {
  private mem = new InMemoryManagementStore();

  public get memStore(): InMemoryManagementStore {
    return this.mem;
  }

  constructor() {
    if (process.env.NODE_ENV === 'test') {
      this.mem.initialize();
    }
  }

  // ===========================================================================
  // 1. COLLEGE
  // ===========================================================================
  async createCollege(dto: CreateCollegeDto): Promise<CollegeDto> {
    const id = `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record: CollegeDto = {
      id,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      address: dto.address?.trim() || null,
      website: dto.website?.trim() || null,
      contactEmail: dto.contactEmail?.trim() || null,
      contactPhone: dto.contactPhone?.trim() || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { departments: 0 },
    };

    if (process.env.NODE_ENV === 'test') {
      this.mem.colleges.set(record.id, record);
      return record;
    }

    const created = await prisma.college.create({
      data: {
        code: record.code,
        name: record.name,
        address: record.address,
        website: record.website,
        contactEmail: record.contactEmail,
        contactPhone: record.contactPhone,
      },
    });
    return created as CollegeDto;
  }

  async findColleges(): Promise<CollegeDto[]> {
    if (process.env.NODE_ENV === 'test') {
      return Array.from(this.mem.colleges.values());
    }

    const list = await prisma.college.findMany({
      include: { _count: { select: { departments: true } } },
      orderBy: { name: 'asc' },
    });
    return list as CollegeDto[];
  }

  async findCollegeById(id: string): Promise<CollegeDto | null> {
    if (process.env.NODE_ENV === 'test') {
      return this.mem.colleges.get(id) || null;
    }

    const item = await prisma.college.findUnique({
      where: { id },
      include: { _count: { select: { departments: true } } },
    });
    return (item as CollegeDto) || null;
  }

  async findCollegeByCode(code: string): Promise<CollegeDto | null> {
    const upper = code.trim().toUpperCase();
    if (process.env.NODE_ENV === 'test') {
      for (const c of this.mem.colleges.values()) {
        if (c.code === upper) return c;
      }
      return null;
    }

    const item = await prisma.college.findUnique({
      where: { code: upper },
      include: { _count: { select: { departments: true } } },
    });
    return (item as CollegeDto) || null;
  }

  async updateCollege(id: string, dto: UpdateCollegeDto): Promise<CollegeDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const existing = this.mem.colleges.get(id);
      if (!existing) return null;
      const updated: CollegeDto = {
        ...existing,
        code: dto.code ? dto.code.trim().toUpperCase() : existing.code,
        name: dto.name ? dto.name.trim() : existing.name,
        address: dto.address !== undefined ? dto.address?.trim() || null : existing.address,
        website: dto.website !== undefined ? dto.website?.trim() || null : existing.website,
        contactEmail: dto.contactEmail !== undefined ? dto.contactEmail?.trim() || null : existing.contactEmail,
        contactPhone: dto.contactPhone !== undefined ? dto.contactPhone?.trim() || null : existing.contactPhone,
        updatedAt: new Date(),
      };
      this.mem.colleges.set(id, updated);
      return updated;
    }

    const updated = await prisma.college.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() || null } : {}),
        ...(dto.website !== undefined ? { website: dto.website?.trim() || null } : {}),
        ...(dto.contactEmail !== undefined ? { contactEmail: dto.contactEmail?.trim() || null } : {}),
        ...(dto.contactPhone !== undefined ? { contactPhone: dto.contactPhone?.trim() || null } : {}),
      },
      include: { _count: { select: { departments: true } } },
    });
    return updated as CollegeDto;
  }

  async deleteCollege(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      this.mem.colleges.delete(id);
      return true;
    }

    await prisma.college.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // 2. DEPARTMENT
  // ===========================================================================
  async createDepartment(dto: CreateDepartmentDto): Promise<DepartmentDto> {
    const id = `dept-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const college = await this.findCollegeById(dto.collegeId);
    const record: DepartmentDto = {
      id,
      collegeId: dto.collegeId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      createdAt: new Date(),
      updatedAt: new Date(),
      college: college ? { id: college.id, code: college.code, name: college.name } : undefined,
      _count: { courses: 0, classes: 0, students: 0 },
    };

    if (process.env.NODE_ENV === 'test') {
      this.mem.departments.set(record.id, record);
      return record;
    }

    const created = await prisma.department.create({
      data: {
        collegeId: dto.collegeId,
        code: record.code,
        name: record.name,
      },
      include: { college: { select: { id: true, code: true, name: true } } },
    });
    return created as DepartmentDto;
  }

  async findDepartments(collegeId?: string): Promise<DepartmentDto[]> {
    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(this.mem.departments.values());
      if (collegeId) {
        list = list.filter((d) => d.collegeId === collegeId);
      }
      return list;
    }

    const list = await prisma.department.findMany({
      where: collegeId ? { collegeId } : undefined,
      include: {
        college: { select: { id: true, code: true, name: true } },
        courses: { select: { id: true, code: true, name: true } },
        _count: { select: { courses: true, classes: true, students: true } },
      },
      orderBy: { name: 'asc' },
    });
    return list as DepartmentDto[];
  }

  async findDepartmentById(id: string): Promise<DepartmentDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const dept = this.mem.departments.get(id);
      if (!dept) return null;
      const coursesCount = Array.from(this.mem.courses.values()).filter((c) => c.departmentId === id).length;
      const classesCount = Array.from(this.mem.classes.values()).filter((cl) => cl.departmentId === id).length;
      const studentsCount = Array.from(this.mem.students.values()).filter((s) => s.departmentId === id).length;
      return {
        ...dept,
        _count: { courses: coursesCount, classes: classesCount, students: studentsCount },
      };
    }

    const item = await prisma.department.findUnique({
      where: { id },
      include: {
        college: { select: { id: true, code: true, name: true } },
        _count: { select: { courses: true, classes: true, students: true } },
      },
    });
    return (item as DepartmentDto) || null;
  }

  async findDepartmentByCode(collegeId: string, code: string): Promise<DepartmentDto | null> {
    const upper = code.trim().toUpperCase();
    if (process.env.NODE_ENV === 'test') {
      for (const d of this.mem.departments.values()) {
        if (d.collegeId === collegeId && d.code === upper) return d;
      }
      return null;
    }

    const item = await prisma.department.findFirst({
      where: { collegeId, code: upper },
      include: {
        college: { select: { id: true, code: true, name: true } },
        _count: { select: { courses: true, classes: true, students: true } },
      },
    });
    return (item as DepartmentDto) || null;
  }

  async findDepartmentByName(collegeId: string, name: string): Promise<DepartmentDto | null> {
    const trimmed = name.trim().toLowerCase();
    if (process.env.NODE_ENV === 'test') {
      for (const d of this.mem.departments.values()) {
        if (d.collegeId === collegeId && d.name.trim().toLowerCase() === trimmed) return d;
      }
      return null;
    }

    const item = await prisma.department.findFirst({
      where: { collegeId, name: { equals: name.trim() } },
      include: {
        college: { select: { id: true, code: true, name: true } },
        _count: { select: { courses: true, classes: true, students: true } },
      },
    });
    return (item as DepartmentDto) || null;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const existing = this.mem.departments.get(id);
      if (!existing) return null;
      const updated: DepartmentDto = {
        ...existing,
        code: dto.code ? dto.code.trim().toUpperCase() : existing.code,
        name: dto.name ? dto.name.trim() : existing.name,
        updatedAt: new Date(),
      };
      this.mem.departments.set(id, updated);
      return updated;
    }

    const updated = await prisma.department.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
      },
      include: {
        college: { select: { id: true, code: true, name: true } },
        _count: { select: { courses: true, classes: true, students: true } },
      },
    });
    return updated as DepartmentDto;
  }

  async deleteDepartment(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      this.mem.departments.delete(id);
      return true;
    }

    await prisma.department.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // 3. COURSE
  // ===========================================================================
  async createCourse(dto: CreateCourseDto): Promise<CourseDto> {
    const id = `crs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const dept = await this.findDepartmentById(dto.departmentId);
    const record: CourseDto = {
      id,
      departmentId: dto.departmentId,
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      durationYears: dto.durationYears || 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      department: dept ? { id: dept.id, code: dept.code, name: dept.name } : undefined,
      _count: { classes: 0, students: 0 },
    };

    if (process.env.NODE_ENV === 'test') {
      this.mem.courses.set(record.id, record);
      return record;
    }

    const created = await prisma.course.create({
      data: {
        departmentId: dto.departmentId,
        code: record.code,
        name: record.name,
        durationYears: record.durationYears,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        _count: { select: { classes: true, students: true } },
      },
    });
    return created as CourseDto;
  }

  async findCourses(departmentId?: string): Promise<CourseDto[]> {
    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(this.mem.courses.values());
      if (departmentId) {
        list = list.filter((c) => c.departmentId === departmentId);
      }
      return list;
    }

    const list = await prisma.course.findMany({
      where: departmentId ? { departmentId } : undefined,
      include: {
        department: { select: { id: true, code: true, name: true } },
        _count: { select: { classes: true, students: true } },
      },
      orderBy: { name: 'asc' },
    });
    return list as CourseDto[];
  }

  async findCourseById(id: string): Promise<CourseDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const crs = this.mem.courses.get(id);
      if (!crs) return null;
      const classesCount = Array.from(this.mem.classes.values()).filter((cl) => cl.courseId === id).length;
      const studentsCount = Array.from(this.mem.students.values()).filter((s) => s.courseId === id).length;
      return {
        ...crs,
        _count: { classes: classesCount, students: studentsCount },
      };
    }

    const item = await prisma.course.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        _count: { select: { classes: true, students: true } },
      },
    });
    return (item as CourseDto) || null;
  }

  async findCourseByCode(departmentId: string, code: string): Promise<CourseDto | null> {
    const upper = code.trim().toUpperCase();
    if (process.env.NODE_ENV === 'test') {
      for (const c of this.mem.courses.values()) {
        if (c.departmentId === departmentId && c.code === upper) return c;
      }
      return null;
    }

    const item = await prisma.course.findFirst({
      where: { departmentId, code: upper },
      include: {
        department: { select: { id: true, code: true, name: true } },
        _count: { select: { classes: true, students: true } },
      },
    });
    return (item as CourseDto) || null;
  }

  async findCourseByName(departmentId: string, name: string): Promise<CourseDto | null> {
    const trimmed = name.trim().toLowerCase();
    if (process.env.NODE_ENV === 'test') {
      for (const c of this.mem.courses.values()) {
        if (c.departmentId === departmentId && c.name.trim().toLowerCase() === trimmed) return c;
      }
      return null;
    }

    const item = await prisma.course.findFirst({
      where: { departmentId, name: { equals: name.trim() } },
      include: {
        department: { select: { id: true, code: true, name: true } },
        _count: { select: { classes: true, students: true } },
      },
    });
    return (item as CourseDto) || null;
  }

  async updateCourse(id: string, dto: UpdateCourseDto): Promise<CourseDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const existing = this.mem.courses.get(id);
      if (!existing) return null;
      const updated: CourseDto = {
        ...existing,
        code: dto.code ? dto.code.trim().toUpperCase() : existing.code,
        name: dto.name ? dto.name.trim() : existing.name,
        durationYears: dto.durationYears !== undefined ? dto.durationYears : existing.durationYears,
        updatedAt: new Date(),
      };
      this.mem.courses.set(id, updated);
      return updated;
    }

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.durationYears !== undefined ? { durationYears: dto.durationYears } : {}),
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        _count: { select: { classes: true, students: true } },
      },
    });
    return updated as CourseDto;
  }

  async deleteCourse(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      this.mem.courses.delete(id);
      return true;
    }

    await prisma.course.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // 4. CLASS
  // ===========================================================================
  async createClass(dto: CreateClassDto): Promise<ClassDto> {
    const id = `cls-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const dept = await this.findDepartmentById(dto.departmentId);
    const course = await this.findCourseById(dto.courseId);
    const className = dto.name?.trim() || `${dept?.code || 'CLASS'}-${dto.batchYear}`;
    const record: ClassDto = {
      id,
      departmentId: dto.departmentId,
      courseId: dto.courseId,
      name: className,
      batchYear: dto.batchYear,
      currentYear: dto.currentYear,
      createdAt: new Date(),
      updatedAt: new Date(),
      department: dept ? { id: dept.id, code: dept.code, name: dept.name } : undefined,
      course: course ? { id: course.id, code: course.code, name: course.name } : undefined,
      _count: { sections: 0, students: 0 },
    };

    if (process.env.NODE_ENV === 'test') {
      this.mem.classes.set(record.id, record);
      return record;
    }

    const created = await prisma.class.create({
      data: {
        departmentId: dto.departmentId,
        courseId: dto.courseId,
        batchYear: dto.batchYear,
        currentYear: dto.currentYear,
        name: className,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        _count: { select: { sections: true, students: true } },
      },
    });
    return created as ClassDto;
  }

  async findClasses(courseId?: string, departmentId?: string): Promise<ClassDto[]> {
    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(this.mem.classes.values());
      if (courseId) list = list.filter((c) => c.courseId === courseId);
      if (departmentId) list = list.filter((c) => c.departmentId === departmentId);
      return list;
    }

    const list = await prisma.class.findMany({
      where: {
        ...(courseId ? { courseId } : {}),
        ...(departmentId ? { departmentId } : {}),
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        _count: { select: { sections: true, students: true } },
      },
      orderBy: { batchYear: 'desc' },
    });
    return list as ClassDto[];
  }

  async findClassById(id: string): Promise<ClassDto | null> {
    if (process.env.NODE_ENV === 'test') {
      return this.mem.classes.get(id) || null;
    }

    const item = await prisma.class.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        _count: { select: { sections: true, students: true } },
      },
    });
    return (item as ClassDto) || null;
  }

  async findClassByBatchYear(courseId: string, batchYear: number, currentYear: number): Promise<ClassDto | null> {
    if (process.env.NODE_ENV === 'test') {
      for (const c of this.mem.classes.values()) {
        if (c.courseId === courseId && c.batchYear === batchYear && c.currentYear === currentYear) {
          return c;
        }
      }
      return null;
    }

    const item = await prisma.class.findFirst({
      where: { courseId, batchYear, currentYear },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        _count: { select: { sections: true, students: true } },
      },
    });
    return (item as ClassDto) || null;
  }

  async updateClass(id: string, dto: UpdateClassDto): Promise<ClassDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const existing = this.mem.classes.get(id);
      if (!existing) return null;
      const updated: ClassDto = {
        ...existing,
        name: dto.name ? dto.name.trim() : existing.name,
        currentYear: dto.currentYear !== undefined ? dto.currentYear : existing.currentYear,
        updatedAt: new Date(),
      };
      this.mem.classes.set(id, updated);
      return updated;
    }

    const updated = await prisma.class.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.currentYear !== undefined ? { currentYear: dto.currentYear } : {}),
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        _count: { select: { sections: true, students: true } },
      },
    });
    return updated as ClassDto;
  }

  async deleteClass(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      this.mem.classes.delete(id);
      return true;
    }

    await prisma.class.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // 5. SECTION
  // ===========================================================================
  async createSection(dto: CreateSectionDto): Promise<SectionDto> {
    const id = `sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const cls = await this.findClassById(dto.classId);
    const record: SectionDto = {
      id,
      classId: dto.classId,
      name: dto.name.trim().toUpperCase(),
      createdAt: new Date(),
      updatedAt: new Date(),
      class: cls ? { id: cls.id, name: cls.name, batchYear: cls.batchYear, currentYear: cls.currentYear } : undefined,
      _count: { students: 0 },
    };

    if (process.env.NODE_ENV === 'test') {
      this.mem.sections.set(record.id, record);
      return record;
    }

    const created = await prisma.section.create({
      data: {
        classId: dto.classId,
        name: record.name,
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            batchYear: true,
            currentYear: true,
          },
        },
        _count: { select: { students: true } },
      },
    });
    return created as SectionDto;
  }

  async findSections(classId?: string): Promise<SectionDto[]> {
    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(this.mem.sections.values());
      if (classId) list = list.filter((s) => s.classId === classId);
      return list;
    }

    const list = await prisma.section.findMany({
      where: classId ? { classId } : undefined,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            batchYear: true,
            currentYear: true,
          },
        },
        _count: { select: { students: true } },
      },
      orderBy: { name: 'asc' },
    });
    return list as SectionDto[];
  }

  async findSectionById(id: string): Promise<SectionDto | null> {
    if (process.env.NODE_ENV === 'test') {
      return this.mem.sections.get(id) || null;
    }

    const item = await prisma.section.findUnique({
      where: { id },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            batchYear: true,
            currentYear: true,
          },
        },
        _count: { select: { students: true } },
      },
    });
    return (item as SectionDto) || null;
  }

  async findSectionByName(classId: string, name: string): Promise<SectionDto | null> {
    const upper = name.trim().toUpperCase();
    if (process.env.NODE_ENV === 'test') {
      for (const s of this.mem.sections.values()) {
        if (s.classId === classId && s.name === upper) return s;
      }
      return null;
    }

    const item = await prisma.section.findFirst({
      where: { classId, name: upper },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            batchYear: true,
            currentYear: true,
          },
        },
        _count: { select: { students: true } },
      },
    });
    return (item as SectionDto) || null;
  }

  async updateSection(id: string, dto: UpdateSectionDto): Promise<SectionDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const existing = this.mem.sections.get(id);
      if (!existing) return null;
      const updated: SectionDto = {
        ...existing,
        name: dto.name ? dto.name.trim().toUpperCase() : existing.name,
        updatedAt: new Date(),
      };
      this.mem.sections.set(id, updated);
      return updated;
    }

    const updated = await prisma.section.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim().toUpperCase() } : {}),
      },
      include: {
        class: {
          select: {
            id: true,
            name: true,
            batchYear: true,
            currentYear: true,
          },
        },
        _count: { select: { students: true } },
      },
    });
    return updated as SectionDto;
  }

  async deleteSection(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      this.mem.sections.delete(id);
      return true;
    }

    await prisma.section.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // 6. STUDENT
  // ===========================================================================
  async createStudent(dto: CreateStudentDto): Promise<StudentDto> {
    const id = `stu-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const dept = await this.findDepartmentById(dto.departmentId);
    const course = await this.findCourseById(dto.courseId);
    const cls = await this.findClassById(dto.classId);
    const sec = await this.findSectionById(dto.sectionId);

    const record: StudentDto = {
      id,
      userId: dto.userId || null,
      registerNumber: dto.registerNumber.trim().toUpperCase(),
      name: dto.name.trim(),
      collegeEmail: dto.collegeEmail.trim().toLowerCase(),
      phone: dto.phone?.trim() || null,
      dob: dto.dob?.trim() || null,
      departmentId: dto.departmentId,
      courseId: dto.courseId,
      classId: dto.classId,
      sectionId: dto.sectionId,
      year: dto.year,
      cgpa: dto.cgpa || null,
      status: dto.status || StudentStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
      department: dept ? { id: dept.id, code: dept.code, name: dept.name } : undefined,
      course: course ? { id: course.id, code: course.code, name: course.name } : undefined,
      class: cls ? { id: cls.id, name: cls.name, batchYear: cls.batchYear, currentYear: cls.currentYear } : undefined,
      section: sec ? { id: sec.id, name: sec.name } : undefined,
    };

    if (process.env.NODE_ENV === 'test') {
      this.mem.students.set(record.id, record);
      return record;
    }

    const created = await prisma.student.create({
      data: {
        userId: record.userId,
        registerNumber: record.registerNumber,
        name: record.name,
        collegeEmail: record.collegeEmail,
        phone: record.phone,
        dob: record.dob,
        departmentId: record.departmentId,
        courseId: record.courseId,
        classId: record.classId,
        sectionId: record.sectionId,
        year: record.year,
        cgpa: record.cgpa,
        status: record.status,
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, name: true, batchYear: true, currentYear: true } },
        section: { select: { id: true, name: true } },
      },
    });
    return created as StudentDto;
  }

  async findStudents(filters: StudentQueryFilters): Promise<PaginatedResult<StudentDto>> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 10));
    const skip = (page - 1) * limit;

    const search = filters.search?.trim();
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';

    if (process.env.NODE_ENV === 'test') {
      let list = Array.from(this.mem.students.values());

      if (filters.departmentId) list = list.filter((s) => s.departmentId === filters.departmentId);
      if (filters.courseId) list = list.filter((s) => s.courseId === filters.courseId);
      if (filters.classId) list = list.filter((s) => s.classId === filters.classId);
      if (filters.sectionId) list = list.filter((s) => s.sectionId === filters.sectionId);
      if (filters.year) list = list.filter((s) => s.year === filters.year);
      if (filters.status) list = list.filter((s) => s.status === filters.status);

      if (search) {
        const lower = search.toLowerCase();
        list = list.filter(
          (s) =>
            s.name.toLowerCase().includes(lower) ||
            s.registerNumber.toLowerCase().includes(lower) ||
            s.collegeEmail.toLowerCase().includes(lower)
        );
      }

      list.sort((a, b) => {
        let valA: unknown = (a as unknown as Record<string, unknown>)[sortBy];
        let valB: unknown = (b as unknown as Record<string, unknown>)[sortBy];
        if (sortBy === 'createdAt') {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        }
        if (valA === valB) return 0;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return sortOrder === 'asc'
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });

      const totalCount = list.length;
      const totalPages = Math.ceil(totalCount / limit) || 1;
      const paginated = list.slice(skip, skip + limit);

      return {
        data: paginated,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    }

    const whereClause: Record<string, unknown> = {
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.courseId ? { courseId: filters.courseId } : {}),
      ...(filters.classId ? { classId: filters.classId } : {}),
      ...(filters.sectionId ? { sectionId: filters.sectionId } : {}),
      ...(filters.year ? { year: filters.year } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { registerNumber: { contains: search } },
              { collegeEmail: { contains: search } },
            ],
          }
        : {}),
    };

    const [totalCount, items] = await Promise.all([
      prisma.student.count({ where: whereClause }),
      prisma.student.findMany({
        where: whereClause,
        include: {
          department: { select: { id: true, code: true, name: true } },
          course: { select: { id: true, code: true, name: true } },
          class: { select: { id: true, name: true, batchYear: true, currentYear: true } },
          section: { select: { id: true, name: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      data: items as StudentDto[],
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async findStudentById(id: string): Promise<StudentDto | null> {
    if (process.env.NODE_ENV === 'test') {
      return this.mem.students.get(id) || null;
    }

    const item = await prisma.student.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, name: true, batchYear: true, currentYear: true } },
        section: { select: { id: true, name: true } },
      },
    });
    return (item as StudentDto) || null;
  }

  async findStudentByRegisterNumber(regNum: string): Promise<StudentDto | null> {
    const upper = regNum.trim().toUpperCase();
    if (process.env.NODE_ENV === 'test') {
      for (const s of this.mem.students.values()) {
        if (s.registerNumber === upper) return s;
      }
      return null;
    }

    const item = await prisma.student.findUnique({
      where: { registerNumber: upper },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, name: true, batchYear: true, currentYear: true } },
        section: { select: { id: true, name: true } },
      },
    });
    return (item as StudentDto) || null;
  }

  async findStudentByEmail(email: string): Promise<StudentDto | null> {
    const lower = email.trim().toLowerCase();
    if (process.env.NODE_ENV === 'test') {
      for (const s of this.mem.students.values()) {
        if (s.collegeEmail.toLowerCase() === lower) return s;
      }
      return null;
    }

    const item = await prisma.student.findUnique({
      where: { collegeEmail: lower },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, name: true, batchYear: true, currentYear: true } },
        section: { select: { id: true, name: true } },
      },
    });
    return (item as StudentDto) || null;
  }

  async updateStudent(id: string, dto: UpdateStudentDto): Promise<StudentDto | null> {
    if (process.env.NODE_ENV === 'test') {
      const existing = this.mem.students.get(id);
      if (!existing) return null;
      const updated: StudentDto = {
        ...existing,
        name: dto.name ? dto.name.trim() : existing.name,
        phone: dto.phone !== undefined ? dto.phone?.trim() || null : existing.phone,
        dob: dto.dob !== undefined ? dto.dob?.trim() || null : existing.dob,
        departmentId: dto.departmentId || existing.departmentId,
        courseId: dto.courseId || existing.courseId,
        classId: dto.classId || existing.classId,
        sectionId: dto.sectionId || existing.sectionId,
        year: dto.year !== undefined ? dto.year : existing.year,
        cgpa: dto.cgpa !== undefined ? dto.cgpa : existing.cgpa,
        status: dto.status || existing.status,
        updatedAt: new Date(),
      };
      this.mem.students.set(id, updated);
      return updated;
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() || null } : {}),
        ...(dto.dob !== undefined ? { dob: dto.dob?.trim() || null } : {}),
        ...(dto.departmentId ? { departmentId: dto.departmentId } : {}),
        ...(dto.courseId ? { courseId: dto.courseId } : {}),
        ...(dto.classId ? { classId: dto.classId } : {}),
        ...(dto.sectionId ? { sectionId: dto.sectionId } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.cgpa !== undefined ? { cgpa: dto.cgpa } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
      include: {
        department: { select: { id: true, code: true, name: true } },
        course: { select: { id: true, code: true, name: true } },
        class: { select: { id: true, name: true, batchYear: true, currentYear: true } },
        section: { select: { id: true, name: true } },
      },
    });
    return updated as StudentDto;
  }

  async deleteStudent(id: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'test') {
      this.mem.students.delete(id);
      return true;
    }

    await prisma.student.delete({ where: { id } });
    return true;
  }

  // ===========================================================================
  // 7. VALIDATION HELPERS & BULK
  // ===========================================================================
  async validateCourseDepartment(courseId: string, departmentId: string): Promise<boolean> {
    const course = await this.findCourseById(courseId);
    return !!course && course.departmentId === departmentId;
  }

  async validateClassHierarchy(classId: string, courseId: string, departmentId: string): Promise<boolean> {
    const cls = await this.findClassById(classId);
    return !!cls && cls.courseId === courseId && cls.departmentId === departmentId;
  }

  async validateSectionClass(sectionId: string, classId: string): Promise<boolean> {
    const sec = await this.findSectionById(sectionId);
    return !!sec && sec.classId === classId;
  }

  async bulkCreateStudents(students: CreateStudentDto[]): Promise<number> {
    if (process.env.NODE_ENV === 'test') {
      let createdCount = 0;
      for (const s of students) {
        await this.createStudent(s);
        createdCount++;
      }
      return createdCount;
    }

    const result = await prisma.$transaction(
      students.map((s) =>
        prisma.student.create({
          data: {
            userId: s.userId || null,
            registerNumber: s.registerNumber.trim().toUpperCase(),
            name: s.name.trim(),
            collegeEmail: s.collegeEmail.trim().toLowerCase(),
            phone: s.phone?.trim() || null,
            dob: s.dob?.trim() || null,
            departmentId: s.departmentId,
            courseId: s.courseId,
            classId: s.classId,
            sectionId: s.sectionId,
            year: s.year,
            cgpa: s.cgpa || null,
            status: s.status || StudentStatus.ACTIVE,
          },
        })
      )
    );
    return result.length;
  }
}

export const managementRepository = new ManagementRepository();
